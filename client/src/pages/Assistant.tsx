import { trpc } from "@/lib/trpc";
import { ArrowLeft, Mic, MicOff, Square, Loader2, Copy, Check, Camera } from "lucide-react";
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
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraProcessing, setCameraProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const uploadAudio = trpc.uploadAudio.useMutation();
  const processAudio = trpc.processAudio.useMutation();
  const processImage = trpc.processImage.useMutation();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await processRecording(blob, mimeType);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const processRecording = async (blob: Blob, mimeType: string) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(blob);
      });

      const { url } = await uploadAudio.mutateAsync({
        audioBase64: base64,
        mimeType: mimeType.split(";")[0],
      });

      const data = await processAudio.mutateAsync({
        audioUrl: url,
        previousContext: previousContext || undefined,
      });

      setResult(data);
      setPreviousContext((prev) =>
        prev ? `${prev}\nQ: ${data.transcription}\nA: ${data.answer}` : `Q: ${data.transcription}\nA: ${data.answer}`
      );
    } catch (err) {
      console.error("Process error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyAnswer = () => {
    if (result?.answer) {
      navigator.clipboard.writeText(result.answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Camera functions
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
        context: previousContext || undefined,
      });
      setResult({
        transcription: "",
        translation: "",
        answer: data.answer,
        summaryPtBr: data.summaryPtBr,
      });
    } catch (err) {
      console.error("Image process error:", err);
    } finally {
      setCameraProcessing(false);
    }
  }, [previousContext]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
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
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-neon-red">
              <span className="w-2 h-2 rounded-full bg-neon-red animate-pulse" />
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

      {/* Answer zone - TOP (most important) */}
      {result?.answer && (
        <div className="border-b border-cyan/20 bg-cyan/5 px-4 py-3">
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
          {/* PT-BR summary - ultra short */}
          {result.summaryPtBr && (
            <p className="text-cyan/50 text-xs font-mono mt-2 italic">
              → {result.summaryPtBr}
            </p>
          )}
        </div>
      )}

      {/* Transcription zone */}
      {result?.transcription && (
        <div className="border-b border-white/5 px-4 py-3">
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-1">
            Interviewer said
          </span>
          <p
            className="text-white/70 font-mono leading-relaxed"
            style={{ fontSize: `${Math.max(fontSize - 2, 12)}px` }}
          >
            {result.transcription}
          </p>
          {/* PT-BR translation */}
          {result.translation && (
            <p className="text-white/30 text-xs font-mono mt-1.5 italic">
              PT-BR: {result.translation}
            </p>
          )}
        </div>
      )}

      {/* Camera preview */}
      {cameraActive && (
        <div className="relative border-b border-white/5">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-48 object-cover"
          />
          <button
            onClick={captureAndProcess}
            disabled={cameraProcessing}
            className="absolute bottom-2 right-2 bg-cyan text-black px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1"
          >
            {cameraProcessing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Camera className="w-3 h-3" />
            )}
            {cameraProcessing ? "..." : "CAPTURAR"}
          </button>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {/* Center area - empty state or waiting */}
      {!result && !isRecording && !isProcessing && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 rounded-full bg-cyan/10 flex items-center justify-center mb-4 animate-pulse-cyan">
            <Mic className="w-7 h-7 text-cyan" />
          </div>
          <p className="text-cyan font-mono text-sm uppercase tracking-widest mb-1">
            Toque para iniciar
          </p>
          <p className="text-white/30 text-xs font-mono">Microfone + Câmera</p>
        </div>
      )}

      {isProcessing && !result && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-cyan animate-spin mb-3" />
          <p className="text-cyan/60 font-mono text-xs uppercase tracking-wider">
            Processando...
          </p>
        </div>
      )}

      {/* Spacer */}
      {result && <div className="flex-1" />}

      {/* Bottom controls */}
      <div className="px-4 py-4 border-t border-white/5 flex items-center justify-center gap-4">
        {/* Camera toggle */}
        <button
          onClick={cameraActive ? stopCamera : startCamera}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${
            cameraActive
              ? "border-cyan bg-cyan/10 text-cyan"
              : "border-white/20 text-white/40 hover:border-white/40"
          }`}
        >
          <Camera className="w-5 h-5" />
        </button>

        {/* Main record button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            isRecording
              ? "bg-neon-red animate-pulse-cyan"
              : isProcessing
                ? "bg-white/10 opacity-50"
                : "bg-cyan hover:scale-105"
          }`}
          style={isRecording ? { boxShadow: "0 0 20px oklch(0.65 0.25 25 / 0.5)" } : {}}
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
          }}
          className="w-12 h-12 rounded-full flex items-center justify-center border border-white/20 text-white/40 hover:border-white/40 transition-all"
        >
          <span className="text-xs font-mono">CLR</span>
        </button>
      </div>
    </div>
  );
}
