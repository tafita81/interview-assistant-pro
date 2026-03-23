/**
 * REALTIME ENGINE v2 - Buffer contínuo com detecção de silêncio
 * - Acumula áudio continuamente no buffer
 * - Detecta silêncio para identificar fim de frase
 * - Transcreve frase completa quando silêncio é detectado
 * - Sem perda de palavras
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
  isQuestion: (input: { transcription: string }) => Promise<{ isQuestion: boolean; confidence: number; reason?: string }>;
}

export class RealtimeAudioEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private audioStream: MediaStream | null = null;
  private isRecording = false;

  // Buffer contínuo de áudio
  private audioBuffer: Blob[] = [];
  private bufferStartTime = Date.now();
  private lastAudioTime = Date.now();
  private silenceThreshold = 1500; // 1.5 segundos de silêncio = fim de frase

  // Acumulador de transcrição
  private accumulatedText = "";
  private questionDetected = false;

  // Callbacks
  private callbacks: RealtimeEngineCallbacks;
  private api: RealtimeEngineAPI;

  constructor(callbacks: RealtimeEngineCallbacks, api: RealtimeEngineAPI) {
    this.callbacks = callbacks;
    this.api = api;
  }

  /**
   * Iniciar captura de áudio
   */
  async start(): Promise<void> {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.audioStream, { mimeType: "audio/webm" });

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.handleAudioChunk(event.data);
        }
      };

      this.mediaRecorder.onerror = (event: Event) => {
        const msg = (event as any).error || "Unknown error";
        console.error("[RealtimeEngine] Erro:", msg);
        this.callbacks.onError?.(`Erro ao capturar áudio: ${msg}`);
      };

      this.mediaRecorder.start(100); // Chunks a cada 100ms para detecção rápida de silêncio
      this.isRecording = true;
      console.log("[RealtimeEngine] Captura iniciada - buffer contínuo");

      // Monitorar silêncio
      this.startSilenceDetection();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[RealtimeEngine] Erro ao acessar microfone:", msg);
      this.callbacks.onError?.(`Erro ao iniciar captura: ${msg}`);
      throw error;
    }
  }

  /**
   * Processar chunk de áudio
   */
  private handleAudioChunk(blob: Blob): void {
    this.audioBuffer.push(blob);
    this.lastAudioTime = Date.now();
    
    const bufferDuration = (Date.now() - this.bufferStartTime) / 1000;
    this.callbacks.onChunkCaptured?.(bufferDuration);

    console.log(`[RealtimeEngine] Chunk recebido - buffer: ${bufferDuration.toFixed(1)}s`);
  }

  /**
   * Monitorar silêncio e transcrever quando detectado
   */
  private startSilenceDetection(): void {
    const silenceCheckInterval = setInterval(async () => {
      if (!this.isRecording) {
        clearInterval(silenceCheckInterval);
        return;
      }

      const silenceDuration = Date.now() - this.lastAudioTime;

      // Se silêncio > threshold e temos áudio no buffer
      if (silenceDuration > this.silenceThreshold && this.audioBuffer.length > 0) {
        console.log(`[RealtimeEngine] Silêncio detectado (${silenceDuration}ms) - transcrevendo buffer...`);
        
        // Transcrever buffer completo
        await this.transcribeBuffer();
        
        // Resetar buffer
        this.audioBuffer = [];
        this.bufferStartTime = Date.now();
        this.lastAudioTime = Date.now();
      }
    }, 100); // Verificar a cada 100ms
  }

  /**
   * Transcrever buffer completo
   */
  private async transcribeBuffer(): Promise<void> {
    if (this.audioBuffer.length === 0) return;

    try {
      // Combinar todos os chunks em um blob
      const completeBlob = new Blob(this.audioBuffer, { type: "audio/webm" });
      const reader = new FileReader();

      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        
        try {
          // Transcrever
          const result = await this.api.transcribeAudioOnly({
            audioBase64: base64,
            mimeType: "audio/webm",
          });

          const text = result.transcription.trim();
          if (text.length > 0) {
            this.accumulatedText = text;
            console.log("[RealtimeEngine] Transcrição:", text);
            this.callbacks.onTranscriptionChunk?.(text, true);

            // Validar se é pergunta
            await this.validateAndRespond(text);
          }
        } catch (error) {
          console.error("[RealtimeEngine] Erro ao transcrever:", error);
        }
      };

      reader.readAsDataURL(completeBlob);
    } catch (error) {
      console.error("[RealtimeEngine] Erro ao processar buffer:", error);
    }
  }

  /**
   * Validar se é pergunta e gerar resposta
   */
  private async validateAndRespond(text: string): Promise<void> {
    try {
      // Validar se é pergunta
      const validation = await this.api.isQuestion({ transcription: text });

      if (validation.isQuestion && validation.confidence > 60) {
        console.log("[RealtimeEngine] Pergunta legítima detectada");
        this.callbacks.onQuestionDetected?.(text);

        // Gerar resposta
        const response = await this.api.analyzeAndRespond({ transcription: text });
        console.log("[RealtimeEngine] Resposta gerada:", response.answer);
        this.callbacks.onAnswerGenerated?.(response.answer, response.translation);
      } else {
        console.log("[RealtimeEngine] Não é pergunta - ignorando");
      }
    } catch (error) {
      console.error("[RealtimeEngine] Erro ao validar/responder:", error);
    }
  }

  /**
   * Parar captura
   */
  stop(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
      }

      console.log("[RealtimeEngine] Captura parada");
    }
  }

  /**
   * Resetar para próxima pergunta
   */
  resetForNextQuestion(): void {
    this.audioBuffer = [];
    this.accumulatedText = "";
    this.questionDetected = false;
    this.bufferStartTime = Date.now();
    this.lastAudioTime = Date.now();
    console.log("[RealtimeEngine] Reset para próxima pergunta");
  }
}
