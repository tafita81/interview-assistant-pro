import { useState, useRef, useEffect } from "react";
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
  const [questionTranslation, setQuestionTranslation] = useState("");
  const [transcription, setTranscription] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");

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
        // Mostrar pergunta enquanto captura
        if (text && text.length > 0) {
          setQuestionTranslation(text);
        }
      },
      onQuestionDetected: (fullQuestion: string) => {
        console.log("[Engine] Pergunta detectada:", fullQuestion);
      },
      onAnswerGenerated: (answer: string, translation: string) => {
        console.log("[Engine] Resposta gerada - Answer:", answer, "Translation:", translation);
        // answer = resposta em inglês
        // translation = tradução da pergunta em PT-BR
        const truncated = answer.length > 300 ? answer.substring(0, 300) : answer;
        setAnswer(truncated);
        setQuestionTranslation(translation); // Mostrar tradução da pergunta
      },
      onError: (errorMsg: string) => {
        console.error("[Engine] Erro:", errorMsg);
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
            onSuccess: (data) => {
              console.log("[API] analyzeAndRespond retornou:", data);
              resolve(data as { translation: string; answer: string });
            },
            onError: (err) => {
              console.error("[API] analyzeAndRespond erro:", err);
              reject(err);
            },
          });
        });
      },
    };

    engineRef.current = new RealtimeAudioEngine(callbacks, api);
  };

  // Iniciar captura
  const startAudioCapture = async () => {
    setError("");
    setAnswer("");
    setQuestionTranslation("");
    setTranscription("");
    setIsListening(true);

    try {
      if (!engineRef.current) {
        initializeEngine();
      }
      await engineRef.current?.startCapture();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Erro ao acessar microfone: ${errorMsg}`);
      setIsListening(false);
    }
  };

  // Parar captura
  const stopAudioCapture = () => {
    engineRef.current?.stopCapture();
    setIsListening(false);
  };

  useEffect(() => {
    initializeEngine();
  }, []);

  return (
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <ErrorBoundary>
          <Router />
          <Toaster />
        </ErrorBoundary>
      </TooltipProvider>
    </ThemeProvider>
  );
}

// Componente da página de assistente
function AssistantPage() {
  const [answer, setAnswer] = useState("");
  const [questionTranslation, setQuestionTranslation] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");

  const engineRef = useRef<RealtimeAudioEngine | null>(null);
  const transcribeAudioMutation = trpc.transcribeAudioOnly.useMutation();
  const analyzeAndRespondMutation = trpc.analyzeAndRespond.useMutation();

  const initializeEngine = () => {
    const callbacks = {
      onChunkCaptured: () => {},
      onTranscriptionChunk: (text: string) => {
        setQuestionTranslation(text);
      },
      onQuestionDetected: () => {},
      onAnswerGenerated: (answer: string, translation: string) => {
        setAnswer(answer);
        setQuestionTranslation(translation);
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

  const startAudioCapture = async () => {
    setError("");
    setAnswer("");
    setQuestionTranslation("");
    setIsListening(true);

    try {
      if (!engineRef.current) {
        initializeEngine();
      }
      await engineRef.current?.startCapture();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Erro ao acessar microfone: ${errorMsg}`);
      setIsListening(false);
    }
  };

  const stopAudioCapture = () => {
    engineRef.current?.stopCapture();
    setIsListening(false);
  };

  useEffect(() => {
    initializeEngine();
  }, []);

  return (
    <div className="w-full h-screen bg-black flex flex-col">
      {/* 70% - Resposta em Inglês (Cyan) */}
      <div className="flex-1 flex items-center justify-center p-4 border-b border-cyan-500/30 overflow-y-auto">
        <div className="text-center">
          {answer ? (
            <p className="text-lg text-cyan-400 leading-relaxed font-medium">
              {answer}
            </p>
          ) : (
            <p className="text-lg text-gray-500">
              {isListening ? "Aguardando pergunta..." : "Fale uma pergunta..."}
            </p>
          )}
        </div>
      </div>

      {/* 30% - Pergunta Traduzida em PT-BR (Verde) */}
      <div className="flex-1 flex items-center justify-center p-4 border-b border-green-500/30 overflow-y-auto">
        <div className="text-center">
          {questionTranslation ? (
            <p className="text-sm text-green-400 leading-relaxed">
              🇧🇷 {questionTranslation}
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Tradução da pergunta aparecerá aqui
            </p>
          )}
        </div>
      </div>

      {/* Botões e Controles */}
      <div className="flex items-center justify-between p-4 gap-2">
        <button
          onClick={isListening ? stopAudioCapture : startAudioCapture}
          className={`px-6 py-2 rounded-lg font-semibold text-sm transition ${
            isListening
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-cyan-500 hover:bg-cyan-600 text-black"
          }`}
        >
          {isListening ? "🎙️ PARAR" : "🎙️ INICIAR"}
        </button>

        {error && (
          <p className="text-red-400 text-xs flex-1">{error}</p>
        )}
      </div>
    </div>
  );
}

export default AssistantNew;
