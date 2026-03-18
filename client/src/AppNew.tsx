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
import { startEngine, type EngineAPI, type EngineCallbacks } from "../../core/engine";
import { toPhoneticPTBR } from "../../frontend/phonetic-converter";

/**
 * NEW LAYOUT: 70% Resposta + 30% Pergunta Traduzida
 * - Botão iniciar muito pequeno na parte de baixo
 * - Sem informações fixas no meio da tela
 * - Resposta em cyan (70% da tela)
 * - Pergunta traduzida em verde (30% da tela)
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
 * NOVO LAYOUT MINIMALISTA
 */
function AssistantNew() {
  const [answer, setAnswer] = useState("");
  const [translation, setTranslation] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");

  const engineRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const previousContextRef = useRef("");
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // tRPC mutations
  const transcribeAudioMutation = trpc.transcribeAudioOnly.useMutation();
  const analyzeAndRespondMutation = trpc.analyzeAndRespond.useMutation();

  // Inicializar engine com callbacks
  const initializeEngine = () => {
    const callbacks: EngineCallbacks = {
      onTranscription: () => {
        // Não mostrar transcrição, apenas processar
      },
      onTranslation: (text) => {
        setTranslation(text);
      },
      onAnswer: (text) => {
        // Garantir que resposta não excede 300 caracteres
        const truncated = text.length > 300 ? text.substring(0, 300) : text;
        setAnswer(truncated);
      },
      onError: (errorMsg) => {
        setError(errorMsg);
      },
      onReset: () => {
        // Reset para próxima pergunta
        setTranslation("");
        setAnswer("");
        setError("");
      },
    };

    const api: EngineAPI = {
      transcribeAudioOnly: async (input) => {
        return new Promise((resolve, reject) => {
          transcribeAudioMutation.mutate(input, {
            onSuccess: (data) => resolve(data),
            onError: (err) => reject(err),
          });
        });
      },
      analyzeAndRespond: async (input) => {
        return new Promise((resolve, reject) => {
          analyzeAndRespondMutation.mutate(input, {
            onSuccess: (data) => resolve(data),
            onError: (err) => reject(err),
          });
        });
      },
    };

    engineRef.current = startEngine(callbacks, api, previousContextRef.current);
  };

  // Iniciar captura de áudio com loop contínuo
  const startAudioCapture = async () => {
    try {
      setError("");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // Setup AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current.ondataavailable = async (e) => {
        if (e.data.size > 0 && engineRef.current) {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = (reader.result as string).split(",")[1];
            await engineRef.current(base64, mimeType);
          };
          reader.readAsDataURL(e.data);
        }
      };

      // Capturar em chunks de 2 segundos (LOOP CONTÍNUO)
      mediaRecorderRef.current.start();
      setIsListening(true);

      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.start();
        }
      }, 2000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setError(`Erro: ${errorMsg}`);
      setIsListening(false);
    }
  };

  const stopAudioCapture = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setIsListening(false);
  };

  useEffect(() => {
    initializeEngine();
  }, []);

  return (
    <div className="w-full h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* RESPOSTA - 70% DA TELA */}
      <div className="flex-[7] flex items-center justify-center p-8 border-b border-cyan-500 overflow-hidden">
        <div className="text-4xl font-bold text-cyan-400 text-center leading-relaxed line-clamp-6 break-words">
          {answer || "Aguardando pergunta..."}
        </div>
      </div>

      {/* PERGUNTA TRADUZIDA - 30% DA TELA */}
      <div className="flex-[3] flex items-center justify-center p-6 bg-black border-b border-green-500 overflow-hidden">
        <div className="text-xl text-green-400 text-center leading-relaxed line-clamp-4 break-words">
          {translation ? `🇧🇷 ${translation}` : "Fale uma pergunta..."}
        </div>
      </div>

      {/* BOTÃO INICIAR MUITO PEQUENO NA PARTE DE BAIXO */}
      <div className="flex items-center justify-center gap-3 bg-black border-t border-gray-700 p-2">
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

        {error && <span className="text-red-400 text-xs">{error}</span>}

        <button
          onClick={() => window.history.back()}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
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
