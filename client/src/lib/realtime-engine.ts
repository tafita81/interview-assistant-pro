/**
 * REALTIME ENGINE - Captura de áudio com streaming contínuo
 * - Chunks de 500-800ms
 * - Transcrição em paralelo (sem await bloqueante)
 * - Detecção rápida de pergunta completa
 * - Resposta em até 2 segundos
 */

export interface RealtimeEngineCallbacks {
  onChunkCaptured?: (duration: number) => void;
  onTranscriptionChunk?: (text: string, isFinal: boolean) => void;
  onQuestionDetected?: (fullQuestion: string) => void;
  onAnswerGenerated?: (answer: string, translation: string) => void;
  onError?: (error: string) => void;
}

export interface RealtimeEngineAPI {
  transcribeAudioOnly: (input: { audioBase64: string; mimeType: string }) => Promise<{ transcription: string }>;
  analyzeAndRespond: (input: { transcription: string; previousContext?: string }) => Promise<{ translation: string; answer: string }>;
}

export class RealtimeAudioEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private audioStream: MediaStream | null = null;
  private isRecording = false;

  // Fila de processamento
  private transcriptionQueue: Array<{
    audioBase64: string;
    mimeType: string;
    timestamp: number;
  }> = [];
  private isProcessingQueue = false;

  // Acumulador de transcrição
  private accumulatedText = "";
  private lastSilenceTime = Date.now();
  private silenceThreshold = 1000; // 1 segundo

  // Controle de pergunta
  private questionDetected = false;
  private lastQuestionTime = 0;

  // Callbacks
  private callbacks: RealtimeEngineCallbacks;
  private api: RealtimeEngineAPI;

  constructor(callbacks: RealtimeEngineCallbacks, api: RealtimeEngineAPI) {
    this.callbacks = callbacks;
    this.api = api;
  }

  /**
   * Iniciar captura de áudio com chunks de 500-800ms
   */
  async startCapture(): Promise<void> {
    try {
      // Tentar acessar microfone
      try {
        this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micError) {
        const msg = micError instanceof Error ? micError.message : String(micError);
        console.error("[RealtimeEngine] Erro ao acessar microfone:", msg);
        this.callbacks.onError?.(`Microfone não disponível: ${msg}`);
        throw micError;
      }

      // Setup AudioContext
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // MediaRecorder com chunks de 500ms
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      this.mediaRecorder = new MediaRecorder(this.audioStream, { mimeType });

      // Processar cada chunk imediatamente
      this.mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          this.handleAudioChunk(e.data, mimeType);
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;

      // Enviar chunks a cada 500-800ms
      this.startChunkTimer();

      console.log("[RealtimeEngine] Captura iniciada com chunks de 500-800ms");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[RealtimeEngine] Erro fatal:", msg);
      this.callbacks.onError?.(`Erro ao iniciar captura: ${msg}`);
      throw error;
    }
  }

  /**
   * Timer para enviar chunks regularmente
   */
  private startChunkTimer(): void {
    const chunkInterval = setInterval(() => {
      if (!this.isRecording) {
        clearInterval(chunkInterval);
        return;
      }

      // Forçar novo chunk
      if (this.mediaRecorder?.state === "recording") {
        this.mediaRecorder.stop();
        this.mediaRecorder.start();
      }
    }, 650); // 650ms (meio do intervalo 500-800ms)
  }

  /**
   * Processar chunk de áudio
   */
  private async handleAudioChunk(blob: Blob, mimeType: string): Promise<void> {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];

      // Adicionar à fila
      this.transcriptionQueue.push({
        audioBase64: base64,
        mimeType,
        timestamp: Date.now(),
      });

      // Processar fila em paralelo (sem await)
      this.processQueueAsync();

      // Atualizar tempo de silêncio
      this.lastSilenceTime = Date.now();
      this.callbacks.onChunkCaptured?.(blob.size);
    };
    reader.readAsDataURL(blob);
  }

  /**
   * Processar fila de transcrição em paralelo
   */
  private async processQueueAsync(): Promise<void> {
    if (this.isProcessingQueue || this.transcriptionQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    // Processar todos os items da fila em paralelo
    const batch = [...this.transcriptionQueue];
    this.transcriptionQueue = [];

    const promises = batch.map((item) =>
      this.api
        .transcribeAudioOnly({
          audioBase64: item.audioBase64,
          mimeType: item.mimeType,
        })
        .then((result) => {
          const text = result.transcription?.trim() || "";
          if (text) {
            this.handleTranscriptionChunk(text);
          }
        })
        .catch((error) => {
          console.error("[RealtimeEngine] Erro na transcrição:", error);
        })
    );

    // Não esperar todas as promessas (fire and forget)
    Promise.all(promises).finally(() => {
      this.isProcessingQueue = false;
      // Processar fila novamente se houver items
      if (this.transcriptionQueue.length > 0) {
        this.processQueueAsync();
      }
    });
  }

  /**
   * Processar chunk de transcrição
   */
  private handleTranscriptionChunk(text: string): void {
    // Acumular texto
    this.accumulatedText += (this.accumulatedText ? " " : "") + text;

    // Callback de transcrição incremental
    this.callbacks.onTranscriptionChunk?.(this.accumulatedText, false);

    // Detectar fim de pergunta
    this.detectQuestionEnd();
  }

  /**
   * Detectar fim de pergunta
   */
  private detectQuestionEnd(): void {
    const now = Date.now();
    const silenceDuration = now - this.lastSilenceTime;

    // Critérios para detectar pergunta completa:
    // 1. Texto termina com "?"
    // 2. OU silêncio > 1 segundo E texto tem pelo menos 3 palavras
    const endsWithQuestion = this.accumulatedText.trim().endsWith("?");
    const hasLongSilence = silenceDuration > this.silenceThreshold;
    const hasMinimumLength = this.accumulatedText.split(" ").length >= 3;

    if (endsWithQuestion || (hasLongSilence && hasMinimumLength)) {
      if (!this.questionDetected) {
        this.questionDetected = true;
        this.lastQuestionTime = now;

        console.log("[RealtimeEngine] Pergunta detectada:", this.accumulatedText);
        this.callbacks.onQuestionDetected?.(this.accumulatedText);

        // Gerar resposta imediatamente
        this.generateResponseAsync();

        // Reset para próxima pergunta
        setTimeout(() => {
          this.resetForNextQuestion();
        }, 100);
      }
    }
  }

  /**
   * Gerar resposta (sem await bloqueante)
   */
  private async generateResponseAsync(): Promise<void> {
    const question = this.accumulatedText;
    console.log("[RealtimeEngine] Iniciando geração de resposta para:", question);

    try {
      const result = await this.api.analyzeAndRespond({
        transcription: question,
        previousContext: undefined,
      });

      console.log("[RealtimeEngine] Resposta recebida:", result);
      this.callbacks.onAnswerGenerated?.(result.answer, result.translation);
    } catch (error) {
      console.error("[RealtimeEngine] Erro ao gerar resposta:", error);
      this.callbacks.onError?.(`Erro ao gerar resposta: ${error}`);
    }
  }

  /**
   * Reset para próxima pergunta
   */
  private resetForNextQuestion(): void {
    this.accumulatedText = "";
    this.questionDetected = false;
    this.lastSilenceTime = Date.now();
    this.callbacks.onTranscriptionChunk?.("", true); // Sinal de reset
  }

  /**
   * Parar captura
   */
  stopCapture(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
    }
    this.isRecording = false;
  }

  /**
   * Obter estado
   */
  isActive(): boolean {
    return this.isRecording;
  }
}
