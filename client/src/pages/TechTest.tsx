import { trpc } from "@/lib/trpc";
import { ArrowLeft, Camera, Copy, Check, Loader2, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

export default function TechTest() {
  const [, navigate] = useLocation();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [summaryPtBr, setSummaryPtBr] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [context, setContext] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraProcessing, setCameraProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const generateAnswer = trpc.generateAnswerFast.useMutation();
  const processImage = trpc.processImageFast.useMutation();

  const handleSubmit = async () => {
    if (!question.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const data = await generateAnswer.mutateAsync({
        question: question.trim(),
        context: context || undefined,
        mode: "technical",
      });
      setAnswer(data.answer);
      setSummaryPtBr(data.summaryPtBr);
      setContext((prev) =>
        prev ? `${prev}\nQ: ${question}\nA: ${data.answer}` : `Q: ${question}\nA: ${data.answer}`
      );
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyAnswer = () => {
    if (answer) {
      navigator.clipboard.writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Camera error:", err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const captureAndProcess = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setCameraProcessing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const base64 = dataUrl.split(",")[1];

    try {
      const data = await processImage.mutateAsync({
        imageBase64: base64,
        context: context || undefined,
      });
      setAnswer(data.answer);
      setSummaryPtBr(data.summaryPtBr);
    } catch (err) {
      console.error("Image process error:", err);
    } finally {
      setCameraProcessing(false);
    }
  }, [context]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Handle Ctrl+Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <button onClick={() => navigate("/")} className="text-white/50 hover:text-cyan p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-cyan/60 uppercase tracking-wider">
            ⚡ Tech Test
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30 font-mono">Font</span>
          <input
            type="range"
            min={12}
            max={24}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-16 h-1 accent-cyan"
          />
          <span className="text-cyan font-mono text-xs w-5">{fontSize}</span>
        </div>
      </div>

      {/* Answer zone - ONLY the answer, no question shown */}
      {answer && (
        <div className="border-b border-cyan/20 bg-cyan/5 px-4 py-3 flex-shrink-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-[10px] font-mono text-cyan/60 uppercase tracking-wider">
              ✦ Answer — Copy & Paste
            </span>
            <button
              onClick={copyAnswer}
              className="flex items-center gap-1 text-cyan/60 hover:text-cyan px-2 py-0.5 rounded border border-cyan/20 hover:border-cyan/40 transition-all text-[10px] font-mono"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "COPIED" : "COPY"}
            </button>
          </div>
          <pre
            className="text-white font-mono leading-relaxed whitespace-pre-wrap break-words"
            style={{ fontSize: `${fontSize}px` }}
          >
            {answer}
          </pre>
          {/* PT-BR summary */}
          {summaryPtBr && (
            <p className="text-cyan/50 text-xs font-mono mt-2 italic">
              → {summaryPtBr}
            </p>
          )}
        </div>
      )}

      {/* Camera preview */}
      {cameraActive && (
        <div className="relative border-b border-white/5 flex-shrink-0">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-52 object-cover"
          />
          <button
            onClick={captureAndProcess}
            disabled={cameraProcessing}
            className="absolute bottom-2 right-2 bg-cyan text-black px-4 py-2 rounded text-xs font-mono font-bold flex items-center gap-1.5 hover:scale-105 transition-transform"
          >
            {cameraProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            {cameraProcessing ? "PROCESSANDO..." : "CAPTURAR & RESOLVER"}
          </button>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {/* Processing indicator */}
      {isProcessing && !answer && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-cyan animate-spin mb-3" />
          <p className="text-cyan/60 font-mono text-xs uppercase tracking-wider">
            Gerando resposta...
          </p>
        </div>
      )}

      {/* Empty state */}
      {!answer && !isProcessing && !cameraActive && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 rounded-full bg-cyan/10 flex items-center justify-center mb-4">
            <Send className="w-7 h-7 text-cyan" />
          </div>
          <p className="text-cyan font-mono text-sm uppercase tracking-widest mb-1">
            Cole a pergunta ou use a câmera
          </p>
          <p className="text-white/30 text-xs font-mono text-center">
            Resposta direta, sem explicações, pronta para copiar
          </p>
        </div>
      )}

      {/* Spacer */}
      {answer && <div className="flex-1" />}

      {/* Bottom input area */}
      <div className="border-t border-white/5 px-3 py-3">
        <div className="flex gap-2 items-end">
          {/* Camera toggle */}
          <button
            onClick={cameraActive ? stopCamera : startCamera}
            className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${
              cameraActive
                ? "border-cyan bg-cyan/10 text-cyan"
                : "border-white/20 text-white/40 hover:border-white/40"
            }`}
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Cole a pergunta aqui... (Ctrl+Enter para enviar)"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono placeholder:text-white/20 focus:border-cyan/40 focus:outline-none resize-none"
            />
          </div>

          {/* Send */}
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !question.trim()}
            className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              isProcessing || !question.trim()
                ? "bg-white/5 text-white/20"
                : "bg-cyan text-black hover:scale-105"
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>

          {/* Clear */}
          <button
            onClick={() => {
              setAnswer("");
              setSummaryPtBr("");
              setQuestion("");
              setContext("");
            }}
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border border-white/10 text-white/30 hover:text-white/60 hover:border-white/30 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-white/15 text-[10px] font-mono mt-1.5 text-center">
          Ctrl+Enter para enviar • Câmera para capturar tela da prova
        </p>
      </div>
    </div>
  );
}
