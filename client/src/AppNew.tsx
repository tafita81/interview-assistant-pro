import { useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import TechTest from "./pages/TechTest";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { trpc } from "@/lib/trpc";
import { RealtimeAudioEngine, type RealtimeEngineAPI } from "@/lib/realtime-engine";
import { toPhoneticPTBR } from "../../frontend/phonetic-converter";

/**
 * REALTIME LAYOUT: 70% Resposta + 30% Pergunta Traduzida
 * - Captura de áudio com chunks de 500-800ms
 * - Streaming contínuo (sem bloqueios)
 * - Latência < 2 segundos
 * - Detecção automática de pergunta completa
 */

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/assistant"} component={AssistantNew} />
      <Route path={"/tech"} component={TechTest} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * NOVO ASSISTENTE REALTIME
 */
function AssistantNew() {
  const [answer, setAnswer] = useState("");
  const [translation, setTranslation] = useState("");
  const [transcription, setTranscription] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");
  const [latency, setLatency] = useState(0);
  const [questionTranslation, setQuestionTranslation] = useState("");

  const engineRef = useRef<RealtimeAudioEngine | null>(null);
  const transcribeAudioMutation = trpc.transcribeAudioOnly.useMutation();
  const analyzeAndRespondMutation = trpc.analyzeAndRespond.useMutation();

  // Inicializar engine realtime
  const initializeEngine = () => {
    const callbacks = {
      onChunkCaptured: (duration: number) => {
        // Log silencioso
      },
      onTranscriptionChunk: (text: string, isFinal: boolean) => {
        setTranscription(text);
        // Traduzir pergunta em tempo real
        if (text && text.length > 0) {
          translateQuestionAsync(text);
        }
      },
      onQuestionDetected: (fullQuestion: string) => {
        // Log silencioso
      },
      onAnswerGenerated: (answer: string, translation: string) => {
        const truncated = answer.length > 300 ? answer.substring(0, 300) : answer;
        setAnswer(truncated);
        setTranslation(translation);
        setLatency(0); // Reset latency
      },
      onError: (errorMsg: string) => {
        setError(errorMsg);
      },
    };

    const api: RealtimeEngineAPI = {
      transcribeAudioOnly: async (input: { audioBase64: string; mimeType: string }) => {
        return new Promise((resolve, reject) => {
          transcribeAudioMutation.mutate(input, {
            onSuccess: (data) => resolve(data as { transcription: string }),
            onError: (err) => reject(err),
          });
        });
      },
      analyzeAndRespond: async (input: { transcription: string; previousContext?: string }) => {
        return new Promise((resolve, reject) => {
          analyzeAndRespondMutation.mutate(input, {
            onSuccess: (data) => resolve(data as { translation: string; answer: string }),
            onError: (err) => reject(err),
          });
        });
      },
    };

    engineRef.current = new RealtimeAudioEngine(callbacks, api);
  };

  // Iniciar captura
  const startAudioCapture = async () => {
    try {
      setError("");
      setAnswer("");
      setTranslation("");
      setTranscription("");

      if (!engineRef.current) {
        initializeEngine();
      }

      await engineRef.current?.startCapture();
      setIsListening(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setError(`Erro: ${errorMsg}`);
      setIsListening(false);
    }
  };

  // Parar captura
  const stopAudioCapture = () => {
    engineRef.current?.stopCapture();
    setIsListening(false);
  };

  // Traduzir pergunta em tempo real
  const translateQuestionAsync = async (question: string) => {
    try {
      const result = await analyzeAndRespondMutation.mutateAsync({
        transcription: question,
      });
      if (result.translation) {
        setQuestionTranslation(result.translation);
      }
    } catch (error) {
      // Silencioso
    }
  };

  useEffect(() => {
    initializeEngine();
  }, []);

  return (
    <div className="w-full h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* RESPOSTA - 70% DA TELA */}
      <div className="flex-[7] flex items-center justify-center p-4 border-b border-cyan-500 overflow-y-auto">
        <div className="text-xl font-semibold text-cyan-400 text-center leading-snug break-words">
          {answer || (transcription ? "Processando..." : "Aguardando pergunta...")}
        </div>
      </div>

      {/* PERGUNTA TRADUZIDA - 30% DA TELA */}
      <div className="flex-[3] flex items-center justify-center p-4 bg-black border-b border-green-500 overflow-y-auto">
        <div className="text-sm text-green-400 text-center leading-snug break-words">
          {questionTranslation ? `🇧🇷 ${questionTranslation}` : transcription ? `📝 ${transcription}` : "Fale uma pergunta..."}
        </div>
      </div>

      {/* CONTROLES NA PARTE DE BAIXO */}
      <div className="flex items-center justify-between gap-3 bg-black border-t border-gray-700 p-2">
        <button
          onClick={isListening ? stopAudioCapture : startAudioCapture}
          className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
            isListening
              ? "bg-red-600 hover:bg-red-700 animate-pulse"
              : "bg-cyan-600 hover:bg-cyan-700"
          }`}
        >
          {isListening ? "🔴 PARAR" : "🎙️ INICIAR"}
        </button>

        {latency > 0 && (
          <span className="text-xs text-gray-400">
            ⚡ {latency}ms
          </span>
        )}

        {error && <span className="text-red-400 text-xs">{error}</span>}

        <button
          onClick={() => window.history.back()}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs ml-auto"
        >
          ← Voltar
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
