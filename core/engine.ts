// UNIFIED ENGINE WITH CONTINUOUS INTERVIEW LOOP
// - Resposta fixa no topo (não muda após geração)
// - Reset automático após resposta para nova pergunta
// - Loop infinito de captura de áudio

import { pushChunk } from "../realtime/question-boundary";
import { updatePrediction } from "../realtime/predictive-engine";
import { buildFinalAnswer } from "../realtime/psychological-engine";
import { optimizeForHiring } from "../realtime/hiring-optimizer";

export interface EngineCallbacks {
  onTranscription?: (text: string) => void;
  onTranslation?: (text: string) => void;
  onAnswer?: (text: string) => void;
  onError?: (error: string) => void;
  onReset?: () => void;
}

export interface EngineAPI {
  transcribeAudioOnly: (input: { audioBase64: string; mimeType: string }) => Promise<{ transcription: string }>;
  analyzeAndRespond: (input: { transcription: string; previousContext?: string }) => Promise<{ translation: string; answer: string }>;
}

export function startEngine(
  callbacks: EngineCallbacks,
  api: EngineAPI,
  previousContext: string = ""
) {
  let lastFullQuestion = "";
  let isProcessing = false;
  let currentAnswer = "";
  let answerLocked = false;

  // Reset state para nova pergunta
  const resetForNewQuestion = () => {
    lastFullQuestion = "";
    currentAnswer = "";
    answerLocked = false;
    callbacks.onReset?.();
  };

  // Auto-reset após alguns segundos de inatividade
  let resetTimeout: NodeJS.Timeout | null = null;
  const scheduleAutoReset = () => {
    if (resetTimeout) clearTimeout(resetTimeout);
    resetTimeout = setTimeout(() => {
      resetForNewQuestion();
    }, 8000); // 8 segundos de inatividade
  };

  return async function onAudioChunk(audioBase64: string, mimeType: string = "audio/webm") {
    // Cancelar auto-reset quando novo áudio chega
    if (resetTimeout) clearTimeout(resetTimeout);

    if (isProcessing) return;

    try {
      // 1. Predict while listening
      updatePrediction(audioBase64);

      // 2. Transcribe audio
      let transcription = "";
      try {
        const transcribeResult = await api.transcribeAudioOnly({
          audioBase64,
          mimeType,
        });
        transcription = transcribeResult.transcription || "";
        
        if (transcription.trim()) {
          callbacks.onTranscription?.(transcription);
        }
      } catch (error) {
        console.error("Transcription error:", error);
        callbacks.onError?.(`Transcription failed: ${error}`);
        scheduleAutoReset();
        return;
      }

      // 3. Wait for full question boundary
      pushChunk(transcription, async (fullQuestion) => {
        // Se pergunta é diferente da anterior, resetar resposta anterior
        if (fullQuestion !== lastFullQuestion && fullQuestion.trim()) {
          if (lastFullQuestion !== "") {
            // Nova pergunta detectada, resetar para nova resposta
            answerLocked = false;
            currentAnswer = "";
          }
          lastFullQuestion = fullQuestion;
        }

        if (!fullQuestion || !fullQuestion.trim()) {
          return;
        }

        // Se já temos resposta bloqueada, não processar novamente
        if (answerLocked) {
          scheduleAutoReset();
          return;
        }

        isProcessing = true;

        try {
          // 4. Get real response from AI
          const aiResponse = await api.analyzeAndRespond({
            transcription: fullQuestion,
            previousContext: previousContext || undefined,
          });

          // 5. Extract components
          let answer = aiResponse.answer || "";
          let translation = aiResponse.translation || "";

          // 6. Psychological layer (enhance but don't replace)
          answer = buildFinalAnswer(answer);

          // 7. Hiring optimization
          answer = optimizeForHiring(answer);

          // 8. LOCK ANSWER (não muda mais)
          currentAnswer = answer;
          answerLocked = true;

          // 9. Output callbacks
          if (translation) {
            callbacks.onTranslation?.(translation);
          }
          if (answer) {
            callbacks.onAnswer?.(answer);
          }

          // Update context for next turn
          previousContext = `Q: ${fullQuestion}\nA: ${answer}`;

          // Schedule auto-reset para próxima pergunta
          scheduleAutoReset();
        } catch (error) {
          console.error("Analysis error:", error);
          callbacks.onError?.(`Analysis failed: ${error}`);
          scheduleAutoReset();
        } finally {
          isProcessing = false;
        }
      });
    } catch (error) {
      console.error("Engine error:", error);
      callbacks.onError?.(`Engine error: ${error}`);
      scheduleAutoReset();
    }
  };
}
