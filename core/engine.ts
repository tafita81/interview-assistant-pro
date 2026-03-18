// UNIFIED ENGINE WITH REAL AI
// Integrates with tRPC backend for real transcription and response generation

import { pushChunk } from "../realtime/question-boundary";
import { updatePrediction } from "../realtime/predictive-engine";
import { buildFinalAnswer } from "../realtime/psychological-engine";
import { optimizeForHiring } from "../realtime/hiring-optimizer";

export interface EngineCallbacks {
  onTranscription?: (text: string) => void;
  onTranslation?: (text: string) => void;
  onAnswer?: (text: string) => void;
  onError?: (error: string) => void;
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

  return async function onAudioChunk(audioBase64: string, mimeType: string = "audio/webm") {
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
        return;
      }

      // 3. Wait for full question boundary
      pushChunk(transcription, async (fullQuestion) => {
        if (!fullQuestion || fullQuestion === lastFullQuestion) {
          return;
        }

        lastFullQuestion = fullQuestion;
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

          // 8. Output callbacks
          if (translation) {
            callbacks.onTranslation?.(translation);
          }
          if (answer) {
            callbacks.onAnswer?.(answer);
          }

          // Update context for next turn
          previousContext = `Q: ${fullQuestion}\nA: ${answer}`;
        } catch (error) {
          console.error("Analysis error:", error);
          callbacks.onError?.(`Analysis failed: ${error}`);
        } finally {
          isProcessing = false;
        }
      });
    } catch (error) {
      console.error("Engine error:", error);
      callbacks.onError?.(`Engine error: ${error}`);
    }
  };
}
