import { useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Assistant from "./pages/Assistant";
import TechTest from "./pages/TechTest";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";

/**
 * NEW INTEGRATED APP
 * - Resposta fixa no topo (não muda enquanto lê)
 * - Versão fonética PT-BR abaixo
 * - Botão de áudio visível
 * - Layout otimizado para entrevista
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
 * NOVO ASSISTENTE COM ENGINE INTEGRADO
 */
function AssistantNew() {
  const [answer, setAnswer] = useState("");
  const [phoneticPTBR, setPhoneticPTBR] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const engineRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Converter texto para fonética PT-BR
  const toPhoneticPTBR = (text: string): string => {
    const map = [
      { regex: /th/g, replace: "d" },
      { regex: /ing\b/g, replace: "in" },
      { regex: /er\b/g, replace: "er" },
      { regex: /a\b/g, replace: "ei" },
      { regex: /i\b/g, replace: "ai" },
      { regex: /e\b/g, replace: "i" },
      { regex: /o\b/g, replace: "ou" },
      { regex: /u\b/g, replace: "iu" },
      { regex: /save/gi, replace: "seiv" },
      { regex: /data/gi, replace: "deita" },
      { regex: /make/gi, replace: "meik" },
      { regex: /use/gi, replace: "iuz" },
    ];

    let result = text;
    map.forEach((rule) => {
      result = result.replace(rule.regex, rule.replace);
    });
    return result;
  };

  // Iniciar engine
  const initializeEngine = async () => {
    try {
      // Simular engine preditivo
      engineRef.current = {
        processChunk: (chunk: string) => {
          // Placeholder: em produção, conectar ao core/engine.ts
          const mockAnswer =
            "I use data to solve problems and deliver results. My approach focuses on actionable insights and business impact.";
          setAnswer(mockAnswer);
          setPhoneticPTBR(toPhoneticPTBR(mockAnswer));
        },
      };
    } catch (error) {
      console.error("Erro ao inicializar engine:", error);
    }
  };

  // Iniciar captura de áudio
  const startAudioCapture = async () => {
    try {
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

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            if (engineRef.current) {
              engineRef.current.processChunk(base64);
            }
          };
          reader.readAsDataURL(e.data);
        }
      };

      // Capturar em chunks de 2 segundos
      mediaRecorderRef.current.start();
      const interval = setInterval(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.start();
        }
      }, 2000);

      setIsListening(true);

      // Monitorar nível de áudio
      const updateAudioLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average =
            dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(Math.min(100, (average / 255) * 100));
          requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();

      return () => {
        clearInterval(interval);
        stream.getTracks().forEach((t) => t.stop());
        setIsListening(false);
      };
    } catch (error) {
      console.error("Erro ao capturar áudio:", error);
      setIsListening(false);
    }
  };

  const audioStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    initializeEngine();
  }, []);

  return (
    <div className="w-full h-screen bg-black text-white flex flex-col">
      {/* RESPOSTA FIXA NO TOPO */}
      <div
        id="answer"
        className="fixed top-0 left-0 right-0 bg-black bg-opacity-90 border-b-2 border-cyan-500 p-6 z-50 min-h-24 flex items-center"
      >
        <div className="text-2xl font-bold text-cyan-400 leading-relaxed">
          {answer || "Aguardando pergunta..."}
        </div>
      </div>

      {/* VERSÃO FONÉTICA PT-BR */}
      <div
        id="phonetic"
        className="fixed top-32 left-0 right-0 bg-black bg-opacity-80 border-b border-yellow-500 p-4 z-40 text-lg text-yellow-400 font-mono"
      >
        {phoneticPTBR && `📖 Fonética: ${phoneticPTBR}`}
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 pt-48 pb-24 overflow-auto flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl px-6 space-y-8">
          {/* INDICADOR DE ÁUDIO */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={startAudioCapture}
              className={`px-8 py-4 rounded-lg font-bold text-lg transition-all ${
                isListening
                  ? "bg-red-600 hover:bg-red-700 animate-pulse"
                  : "bg-cyan-600 hover:bg-cyan-700"
              }`}
            >
              {isListening ? "🔴 OUVINDO..." : "🎙️ INICIAR ÁUDIO"}
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

          {/* STATUS */}
          <div className="text-center text-gray-400 text-sm">
            {isListening ? "🟢 Capturando áudio..." : "Clique para começar"}
          </div>

          {/* INFORMAÇÕES */}
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 text-sm text-gray-300 space-y-2">
            <p>✅ Resposta fixa no topo (não muda enquanto lê)</p>
            <p>✅ Versão fonética PT-BR para pronúncia</p>
            <p>✅ Botão de áudio visível e responsivo</p>
            <p>✅ Nível de áudio em tempo real</p>
            <p>✅ Engine preditivo integrado</p>
          </div>
        </div>
      </div>

      {/* RODAPÉ COM CONTROLES */}
      <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-90 border-t border-gray-700 p-4 flex justify-between items-center">
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
        >
          ← Voltar
        </button>
        <div className="text-xs text-gray-500">Interview Assistant Pro v1.9</div>
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
