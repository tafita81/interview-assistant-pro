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
 * NEW INTEGRATED APP WITH CONTINUOUS INTERVIEW LOOP
 * - Resposta fixa no topo (não muda após geração)
 * - Reset automático após resposta para nova pergunta
 * - Loop infinito de captura de áudio
 * - Respostas limitadas a 3-4 linhas (~300 caracteres)
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
 * NOVO ASSISTENTE COM LOOP CONTÍNUO
 */
function AssistantNew() {
  const [answer, setAnswer] = useState("");
  const [phoneticPTBR, setPhoneticPTBR] = useState("");
  const [translation, setTranslation] = useState("");
  const [transcription, setTranscription] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Pronto para começar");
  const [questionCount, setQuestionCount] = useState(0);

  const engineRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const previousContextRef = useRef("");
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // tRPC mutations
  const transcribeAudioMutation = trpc.transcribeAudioOnly.useMutation();
  const analyzeAndRespondMutation = trpc.analyzeAndRespond.useMutation();

  // Usar conversor fonético centralizado
  // (importado de ../../frontend/phonetic-converter)

  // Inicializar engine com callbacks
  const initializeEngine = () => {
    const callbacks: EngineCallbacks = {
      onTranscription: (text) => {
        setTranscription(text);
        setStatus("Transcrição recebida");
      },
      onTranslation: (text) => {
        setTranslation(text);
        setStatus("Tradução recebida");
      },
      onAnswer: (text) => {
        // Garantir que resposta não excede 300 caracteres
        const truncated = text.length > 300 ? text.substring(0, 300) + "..." : text;
        setAnswer(truncated);
        // Converter para fonética PT-BR para pronúncia
        const phonetic = toPhoneticPTBR(truncated);
        setPhoneticPTBR(phonetic);
        setStatus("Resposta gerada ✓");
        setQuestionCount((prev) => prev + 1);
      },
      onError: (errorMsg) => {
        setError(errorMsg);
        setStatus("Erro ao processar");
      },
      onReset: () => {
        // Reset para próxima pergunta
        setTranscription("");
        setTranslation("");
        setAnswer("");
        setPhoneticPTBR("");
        setStatus("Pronto para nova pergunta");
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
      setStatus("Iniciando captura...");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // Setup AudioContext para visualização
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // MediaRecorder para chunks
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current.ondataavailable = async (e) => {
        if (e.data.size > 0 && engineRef.current) {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = (reader.result as string).split(",")[1];
            setStatus("Processando áudio...");
            await engineRef.current(base64, mimeType);
          };
          reader.readAsDataURL(e.data);
        }
      };

      // Capturar em chunks de 2 segundos (LOOP CONTÍNUO)
      mediaRecorderRef.current.start();
      setIsListening(true);
      setStatus("🎙️ Ouvindo... Fale agora!");

      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.start();
        }
      }, 2000);

      // Monitorar nível de áudio
      const updateAudioLevel = () => {
        if (analyserRef.current && isListening) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average =
            dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(Math.min(100, (average / 255) * 100));
          requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setError(`Erro ao capturar áudio: ${errorMsg}`);
      setStatus("Erro ao capturar áudio");
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
    setStatus("Captura parada");
  };

  useEffect(() => {
    initializeEngine();
  }, []);

  return (
    <div className="w-full h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* RESPOSTA FIXA NO TOPO - NÃO MUDA */}
      <div className="fixed top-0 left-0 right-0 bg-gradient-to-b from-black via-black to-transparent border-b-2 border-cyan-500 p-6 z-50 min-h-28 flex items-center">
        <div className="text-xl font-bold text-cyan-400 leading-relaxed line-clamp-4">
          {answer || "Aguardando pergunta..."}
        </div>
      </div>

      {/* VERSÃO FONÉTICA PT-BR */}
      {phoneticPTBR && (
        <div className="fixed top-32 left-0 right-0 bg-black bg-opacity-90 border-b border-yellow-500 p-3 z-40 text-sm text-yellow-400 font-mono line-clamp-2">
          📖 {phoneticPTBR}
        </div>
      )}

      {/* TRADUÇÃO PT-BR */}
      {translation && (
        <div className="fixed bottom-32 left-0 right-0 bg-black bg-opacity-90 border-t border-green-500 p-3 z-40 text-sm text-green-400 line-clamp-2">
          🇧🇷 {translation}
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 pt-40 pb-40 overflow-auto flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl px-6 space-y-6">
          {/* INDICADOR DE ÁUDIO */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={isListening ? stopAudioCapture : startAudioCapture}
                className={`px-8 py-4 rounded-lg font-bold text-lg transition-all ${
                  isListening
                    ? "bg-red-600 hover:bg-red-700 animate-pulse"
                    : "bg-cyan-600 hover:bg-cyan-700"
                }`}
              >
                {isListening ? "🔴 PARAR" : "🎙️ INICIAR"}
              </button>

              {/* NÍVEL DE ÁUDIO */}
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
                <span className="text-sm text-gray-400">{Math.round(audioLevel)}%</span>
              </div>
            </div>

            {/* STATUS E CONTADOR */}
            <div className="text-center">
              <p className="text-gray-300 text-sm">{status}</p>
              {questionCount > 0 && (
                <p className="text-cyan-400 text-xs mt-1">
                  ✓ {questionCount} pergunta{questionCount !== 1 ? "s" : ""} processada{questionCount !== 1 ? "s" : ""}
                </p>
              )}
              {error && <p className="text-red-400 text-sm mt-2">⚠️ {error}</p>}
            </div>
          </div>

          {/* INFORMAÇÕES */}
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 text-xs text-gray-300 space-y-1">
            <p>✅ Loop contínuo - fale múltiplas perguntas</p>
            <p>✅ Resposta fixa (3-4 linhas máximo)</p>
            <p>✅ Reset automático entre perguntas</p>
            <p>✅ Tradução PT-BR em tempo real</p>
            <p>✅ Versão fonética para pronúncia</p>
          </div>
        </div>
      </div>

      {/* RODAPÉ */}
      <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-95 border-t border-gray-700 p-4 flex justify-between items-center">
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
        >
          ← Voltar
        </button>
        <div className="text-xs text-gray-500">Interview Assistant Pro v2.1 - Continuous Loop</div>
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
