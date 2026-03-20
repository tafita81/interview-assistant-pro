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
 * NOVO FLUXO: Capturar áudio do RECRUITER
 * 
 * 1. Capturar áudio do recruiter (quem faz a pergunta)
 * 2. Transcrever pergunta em tempo real
 * 3. Entender a pergunta
 * 4. Gerar resposta em tempo real baseada na pergunta específica
 * 
 * Layout:
 * - 70% (topo): PERGUNTA TRANSCRITA (cyan)
 * - 30% (meio): RESPOSTA GERADA (verde)
 */

/**
 * PÁGINA DO ASSISTENTE - Captura áudio do recruiter
 */
function AssistantPage() {
  const [recruiterQuestion, setRecruiterQuestion] = useState("");
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);

  const engineRef = useRef<RealtimeAudioEngine | null>(null);
  const transcribeAudioMutation = trpc.transcribeAudioOnly.useMutation();
  const analyzeAndRespondMutation = trpc.analyzeAndRespond.useMutation();

  // Inicializar engine realtime
  const initializeEngine = () => {
    if (engineRef.current) return;
    
    const callbacks = {
      onChunkCaptured: (duration: number) => {
        // Log silencioso
      },
      onTranscriptionChunk: (text: string, isFinal: boolean) => {
        // Mostrar pergunta do recruiter enquanto captura
        if (text && text.length > 0) {
          setRecruiterQuestion(text);
          
          // Resetar timer de silêncio
          if (silenceTimer) clearTimeout(silenceTimer);
          
          // Se transcrição final, aguardar 1s de silêncio antes de gerar resposta
          if (isFinal) {
            const timer = setTimeout(() => {
              // Pergunta completa detectada - gerar resposta
              generateResponseForQuestion(text);
            }, 1000);
            setSilenceTimer(timer);
          }
        }
      },
      onQuestionDetected: (fullQuestion: string) => {
        console.log("[Engine] Pergunta do recruiter detectada:", fullQuestion);
      },
      onAnswerGenerated: (answer: string) => {
        console.log("[Engine] Resposta gerada:", answer);
        const truncated = answer.length > 300 ? answer.substring(0, 300) : answer;
        setCandidateAnswer(truncated);
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

  // Gerar resposta para pergunta do recruiter
  const generateResponseForQuestion = async (question: string) => {
    if (!question || question.length === 0) return;
    
    try {
      const response = await analyzeAndRespondMutation.mutateAsync({
        transcription: question,
        previousContext: "",
      });
      
      // response.answer = resposta em inglês
      const truncated = response.answer.length > 300 
        ? response.answer.substring(0, 300) 
        : response.answer;
      setCandidateAnswer(truncated);
    } catch (err) {
      console.error("Erro ao gerar resposta:", err);
    }
  };

  // Iniciar captura
  const startAudioCapture = async () => {
    setError("");
    setCandidateAnswer("");
    setRecruiterQuestion("");
    setIsListening(true);

    try {
      initializeEngine();
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
    if (silenceTimer) clearTimeout(silenceTimer);
  };

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      engineRef.current?.stopCapture();
      if (silenceTimer) clearTimeout(silenceTimer);
    };
  }, [silenceTimer]);

  return (
    <div className="w-full h-screen bg-black flex flex-col">
      {/* 70% - PERGUNTA DO RECRUITER (Cyan) */}
      <div className="flex-1 flex items-center justify-center p-4 border-b border-cyan-500/30 overflow-y-auto">
        <div className="text-center">
          {recruiterQuestion ? (
            <p className="text-lg text-cyan-400 leading-relaxed font-medium">
              {recruiterQuestion}
            </p>
          ) : (
            <p className="text-lg text-gray-500">
              {isListening ? "Aguardando pergunta do recruiter..." : "Clique em INICIAR para começar..."}
            </p>
          )}
        </div>
      </div>

      {/* 30% - RESPOSTA DO CANDIDATO (Verde) */}
      <div className="flex-1 flex items-center justify-center p-4 border-b border-green-500/30 overflow-y-auto">
        <div className="text-center">
          {candidateAnswer ? (
            <p className="text-sm text-green-400 leading-relaxed">
              🎤 {candidateAnswer}
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Resposta aparecerá aqui
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

/**
 * ROUTER (sem recursão)
 */
function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/assistant"} component={AssistantPage} />
      <Route path={"/tech"} component={TechTest} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * APP ROOT (App shell com providers)
 */
export default function AppNew() {
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
