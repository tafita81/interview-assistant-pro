import { trpc } from "@/lib/trpc";
import { ArrowLeft, Mic, Square, Loader2, Copy, Check, Camera } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

type ProcessResult = {
  transcription: string;
  translation: string;
  answer: string;
  summaryPtBr: string;
};

export default function Assistant() {
  const [, navigate] = useLocation();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [previousContext, setPreviousContext] = useState("");
  const [fontSize, setFontSize] = useState(16);
  const [copied, setCopied] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraProcessing, setCameraProcessing] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const uploadAudio = trpc.uploadAudio.useMutation();
  const processAudio = trpc.processAudio.useMutation();
  const processImage = trpc.processImage.useMutation();

  // ===== AUTO-START CAMERA ON MOUNT =====
  useEffect(() => {
    let cancelled = false;

    const initCamera = async () => {
      try {
        // Request camera (rear) permission
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        cameraStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
          };
        }

        setCameraReady(true);
        setPermissionsGranted(true);
        setError("");
      } catch (err: any) {
        console.error("Camera init error:", err);
        // Camera failed but we can still use audio
        setPermissionsGranted(true);
        setError("");
      }
    };

    initCamera();

    return () => {
      cancelled = true;
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    };
  }, []);

  // ===== AUDIO RECORDING =====
  const startRecording = useCallback(async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Try different mime types for iOS compatibility
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/mp4";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = ""; // Let browser choose
      }

      const options: MediaRecorderOptions = {};
      if (mimeType) options.mimeType = mimeType;

      const recorder = new MediaRecorder(stream, options);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const actualMime = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actualMime });
        if (blob.size > 0) {
          await processRecording(blob, actualMime);
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err: any) {
      console.error("Mic error:", err);
      setError("Erro ao acessar microfone. Verifique permissões.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isProcessing) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, isProcessing, startRecording, stopRecording]);

  // ===== PROCESS AUDIO =====
  const processRecording = async (blob: Blob, mimeType: string) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const cleanMime = mimeType.split(";")[0] || "audio/webm";

      const { url } = await uploadAudio.mutateAsync({
        audioBase64: base64,
        mimeType: cleanMime,
      });

      const data = await processAudio.mutateAsync({
        audioUrl: url,
        previousContext: previousContext || undefined,
      });

      setResult(data);
      setPreviousContext((prev) =>
        prev
          ? `${prev}\nQ: ${data.transcription}\nA: ${data.answer}`
          : `Q: ${data.transcription}\nA: ${data.answer}`
      );
    } catch (err: any) {
      console.error("Process error:", err);
      setError("Erro ao processar áudio. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ===== CAMERA CAPTURE =====
  const captureAndProcess = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setCameraProcessing(true);
    setError("");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.split(",")[1];

    try {
      const data = await processImage.mutateAsync({
        imageBase64: base64,
        context: previousContext || undefined,
      });
      setResult({
        transcription: "",
        translation: "",
        answer: data.answer,
        summaryPtBr: data.summaryPtBr,
      });
    } catch (err: any) {
      console.error("Image process error:", err);
      setError("Erro ao processar imagem.");
    } finally {
      setCameraProcessing(false);
    }
  }, [previousContext]);

  // ===== COPY =====
  const copyAnswer = () => {
    if (result?.answer) {
      navigator.clipboard.writeText(result.answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ minHeight: "100dvh" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 flex-shrink-0">
        <button onClick={() => navigate("/")} className="text-white/50 hover:text-cyan p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30 font-mono uppercase">Font</span>
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
        <div className="flex items-center gap-1">
          {isRecording && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-red-500">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              REC
            </span>
          )}
          {isProcessing && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan">
              <Loader2 className="w-3 h-3 animate-spin" />
              AI
            </span>
          )}
        </div>
      </div>

      {/* ===== ANSWER ZONE - TOP ===== */}
      {result?.answer && (
        <div className="border-b border-cyan/20 bg-cyan/5 px-4 py-3 flex-shrink-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-[10px] font-mono text-cyan/60 uppercase tracking-wider">
              ✦ Your Answer
            </span>
            <button
              onClick={copyAnswer}
              className="text-cyan/60 hover:text-cyan p-0.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p
            className="text-white font-medium leading-relaxed"
            style={{ fontSize: `${fontSize}px` }}
          >
            {result.answer}
          </p>
          {/* PT-BR summary */}
          {result.summaryPtBr && (
            <p className="text-cyan/50 text-xs font-mono mt-2 italic">
              → {result.summaryPtBr}
            </p>
          )}
        </div>
      )}

      {/* ===== TRANSCRIPTION ZONE ===== */}
      {result?.transcription && (
        <div className="border-b border-white/5 px-4 py-3 flex-shrink-0">
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-1">
            Interviewer said
          </span>
          <p
            className="text-white/70 font-mono leading-relaxed"
            style={{ fontSize: `${Math.max(fontSize - 2, 12)}px` }}
          >
            {result.transcription}
          </p>
          {result.translation && (
            <p className="text-white/30 text-xs font-mono mt-1.5 italic">
              PT-BR: {result.translation}
            </p>
          )}
        </div>
      )}

      {/* ===== CAMERA PREVIEW (always visible when ready) ===== */}
      <div className="flex-1 relative bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover absolute inset-0 ${cameraReady ? "opacity-100" : "opacity-0"}`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Capture button overlay */}
        {cameraReady && (
          <button
            onClick={captureAndProcess}
            disabled={cameraProcessing}
            className="absolute top-2 right-2 bg-cyan text-black px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 hover:scale-105 transition-transform z-10"
          >
            {cameraProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            {cameraProcessing ? "..." : "CAPTURAR"}
          </button>
        )}

        {/* Center overlay when no camera and no result */}
        {!cameraReady && !result && !isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <button
              onClick={toggleRecording}
              className="w-20 h-20 rounded-full bg-cyan/10 border-2 border-cyan/30 flex items-center justify-center mb-4 active:scale-95 transition-transform"
            >
              <Mic className="w-8 h-8 text-cyan" />
            </button>
            <p className="text-cyan font-mono text-sm uppercase tracking-widest mb-1">
              Toque para iniciar
            </p>
            <p className="text-white/30 text-xs font-mono">Microfone + Câmera</p>
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && !result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <Loader2 className="w-10 h-10 text-cyan animate-spin mb-3" />
            <p className="text-cyan/60 font-mono text-xs uppercase tracking-wider">
              Processando...
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute top-2 left-2 right-14 bg-red-500/20 border border-red-500/30 rounded px-2 py-1 z-10">
            <p className="text-red-400 text-[10px] font-mono">{error}</p>
          </div>
        )}
      </div>

      {/* ===== BOTTOM CONTROLS ===== */}
      <div className="px-4 py-4 border-t border-white/5 flex items-center justify-center gap-4 flex-shrink-0 bg-black">
        {/* Camera toggle */}
        <button
          onClick={cameraReady ? () => {
            cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
            cameraStreamRef.current = null;
            setCameraReady(false);
          } : async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false,
              });
              cameraStreamRef.current = stream;
              if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => videoRef.current?.play().catch(() => {});
              }
              setCameraReady(true);
            } catch (err) {
              console.error("Camera error:", err);
            }
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${
            cameraReady
              ? "border-cyan bg-cyan/10 text-cyan"
              : "border-white/20 text-white/40 hover:border-white/40"
          }`}
        >
          <Camera className="w-5 h-5" />
        </button>

        {/* Main record button */}
        <button
          onClick={toggleRecording}
          disabled={isProcessing}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${
            isRecording
              ? "bg-red-500"
              : isProcessing
                ? "bg-white/10 opacity-50"
                : "bg-cyan hover:scale-105"
          }`}
          style={isRecording ? { boxShadow: "0 0 20px rgba(239,68,68,0.5)" } : {}}
        >
          {isRecording ? (
            <Square className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-7 h-7 text-black" />
          )}
        </button>

        {/* Clear context */}
        <button
          onClick={() => {
            setResult(null);
            setPreviousContext("");
            setError("");
          }}
          className="w-12 h-12 rounded-full flex items-center justify-center border border-white/20 text-white/40 hover:border-white/40 transition-all"
        >
          <span className="text-xs font-mono">CLR</span>
        </button>
      </div>
    </div>
  );
}
