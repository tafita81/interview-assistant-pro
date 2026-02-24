import { trpc } from "@/lib/trpc";
import { ArrowLeft, Mic, Square, Loader2, Copy, Check, Camera, Scan, ScanLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

type ProcessResult = {
  transcription: string;
  translation: string;
  answer: string;
  summaryPtBr: string;
};

type LensMode = "0.5x" | "1x";

// ===== FRAME DIFF DETECTION =====
function computeFrameDiff(prev: Uint8ClampedArray, curr: Uint8ClampedArray, sampleStep: number): number {
  let diff = 0;
  let count = 0;
  for (let i = 0; i < prev.length; i += 4 * sampleStep) {
    const dr = Math.abs(prev[i] - curr[i]);
    const dg = Math.abs(prev[i + 1] - curr[i + 1]);
    const db = Math.abs(prev[i + 2] - curr[i + 2]);
    diff += (dr + dg + db) / 3;
    count++;
  }
  return count > 0 ? diff / count : 0;
}

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
  const [error, setError] = useState("");
  const [lensMode, setLensMode] = useState<LensMode>("1x");
  const [autoScan, setAutoScan] = useState(false);
  const [scanStatus, setScanStatus] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const diffCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const autoScanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingRef = useRef(false);
  const lastProcessedHashRef = useRef("");
  const previousContextRef = useRef("");

  useEffect(() => {
    previousContextRef.current = previousContext;
  }, [previousContext]);

  const uploadAudio = trpc.uploadAudio.useMutation();
  const processAudio = trpc.processAudio.useMutation();
  const processImage = trpc.processImage.useMutation();

  // ===== FORCE LANDSCAPE =====
  useEffect(() => {
    const tryLandscape = async () => {
      try {
        const orientation = screen.orientation as any;
        if (orientation?.lock) {
          await orientation.lock("landscape").catch(() => {});
        }
      } catch {
        // Not supported
      }
    };
    tryLandscape();

    return () => {
      try {
        (screen.orientation as any)?.unlock?.();
      } catch {}
    };
  }, []);

  // ===== CAMERA: 4K VIDEO =====
  const getVideoConstraints = useCallback((lens: LensMode): MediaTrackConstraints => {
    const base: MediaTrackConstraints = {
      facingMode: { ideal: "environment" },
      width: { ideal: 3840, min: 1920 },
      height: { ideal: 2160, min: 1080 },
      frameRate: { ideal: 30, max: 60 },
    };
    if (lens === "0.5x") {
      return { ...base, advanced: [{ zoom: 0.5 } as any] };
    }
    return base;
  }, []);

  const startCameraWithLens = useCallback(async (lens: LensMode) => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(lens),
        audio: false,
      });
      cameraStreamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const caps = videoTrack.getCapabilities() as any;
          if (caps?.zoom) {
            const targetZoom = lens === "0.5x" ? caps.zoom.min : Math.min(1, caps.zoom.max);
            await videoTrack.applyConstraints({ advanced: [{ zoom: targetZoom }] } as any);
          }
        } catch {}
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current?.play().catch(() => {});
      }
      setCameraReady(true);
      setError("");
    } catch (err: any) {
      console.error("Camera error:", err);
      setError("Erro câmera.");
    }
  }, [getVideoConstraints]);

  const switchLens = useCallback(async (lens: LensMode) => {
    if (lens === lensMode && cameraReady) return;
    setLensMode(lens);
    await startCameraWithLens(lens);
  }, [lensMode, cameraReady, startCameraWithLens]);

  // ===== AUTO-START CAMERA =====
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 3840, min: 1920 },
            height: { ideal: 2160, min: 1080 },
            frameRate: { ideal: 30, max: 60 },
          },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => videoRef.current?.play().catch(() => {});
        }
        setCameraReady(true);
      } catch {}
    };
    init();
    return () => {
      cancelled = true;
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    };
  }, []);

  // ===== AUTO-SCAN: CONTINUOUS OCR WITH DEDUP =====
  const captureFrameForDiff = useCallback((): { data: Uint8ClampedArray; base64: string } | null => {
    if (!videoRef.current || !diffCanvasRef.current) return null;
    const video = videoRef.current;
    const canvas = diffCanvasRef.current;
    const w = video.videoWidth || 3840;
    const h = video.videoHeight || 2160;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const base64 = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
    return { data: imageData.data, base64 };
  }, []);

  const processFrameIfChanged = useCallback(async () => {
    if (isProcessingRef.current) return;
    const frame = captureFrameForDiff();
    if (!frame) return;
    const { data, base64 } = frame;

    if (prevFrameDataRef.current) {
      const diff = computeFrameDiff(prevFrameDataRef.current, data, 20);
      if (diff < 8) return;
    }

    let hash = 0;
    for (let i = 0; i < data.length; i += 400) {
      hash = ((hash << 5) - hash + data[i]) | 0;
    }
    if (hash.toString() === lastProcessedHashRef.current) return;

    prevFrameDataRef.current = new Uint8ClampedArray(data);
    lastProcessedHashRef.current = hash.toString();
    isProcessingRef.current = true;
    setCameraProcessing(true);
    setScanStatus("Detectado...");

    try {
      const res = await processImage.mutateAsync({
        imageBase64: base64,
        context: previousContextRef.current || undefined,
      });
      setResult({ transcription: "", translation: "", answer: res.answer, summaryPtBr: res.summaryPtBr });
      setScanStatus("✓");
    } catch {
      setScanStatus("Erro");
    } finally {
      isProcessingRef.current = false;
      setCameraProcessing(false);
    }
  }, [captureFrameForDiff]);

  useEffect(() => {
    if (autoScan && cameraReady) {
      setScanStatus("Monitorando...");
      autoScanIntervalRef.current = setInterval(() => processFrameIfChanged(), 2000);
    } else {
      if (autoScanIntervalRef.current) { clearInterval(autoScanIntervalRef.current); autoScanIntervalRef.current = null; }
      setScanStatus("");
      prevFrameDataRef.current = null;
      lastProcessedHashRef.current = "";
    }
    return () => { if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current); };
  }, [autoScan, cameraReady, processFrameIfChanged]);

  // ===== AUDIO =====
  const startRecording = useCallback(async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "audio/mp4";
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "";
      const options: MediaRecorderOptions = {};
      if (mimeType) options.mimeType = mimeType;
      const recorder = new MediaRecorder(stream, options);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const actualMime = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actualMime });
        if (blob.size > 0) await processRecording(blob, actualMime);
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch { setError("Erro microfone."); }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isProcessing) return;
    isRecording ? stopRecording() : startRecording();
  }, [isRecording, isProcessing, startRecording, stopRecording]);

  const processRecording = async (blob: Blob, mimeType: string) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const { url } = await uploadAudio.mutateAsync({ audioBase64: base64, mimeType: mimeType.split(";")[0] || "audio/webm" });
      const data = await processAudio.mutateAsync({ audioUrl: url, previousContext: previousContext || undefined });
      setResult(data);
      setPreviousContext((prev) => prev ? `${prev}\nQ: ${data.transcription}\nA: ${data.answer}` : `Q: ${data.transcription}\nA: ${data.answer}`);
    } catch { setError("Erro áudio."); }
    finally { setIsProcessing(false); }
  };

  // ===== MANUAL CAPTURE =====
  const captureAndProcess = useCallback(async () => {
    if (!videoRef.current || !diffCanvasRef.current) return;
    setCameraProcessing(true);
    setError("");
    const video = videoRef.current;
    const canvas = diffCanvasRef.current;
    canvas.width = video.videoWidth || 3840;
    canvas.height = video.videoHeight || 2160;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
    try {
      const data = await processImage.mutateAsync({ imageBase64: base64, context: previousContext || undefined });
      setResult({ transcription: "", translation: "", answer: data.answer, summaryPtBr: data.summaryPtBr });
    } catch { setError("Erro imagem."); }
    finally { setCameraProcessing(false); }
  }, [previousContext]);

  const copyAnswer = () => {
    if (result?.answer) {
      navigator.clipboard.writeText(result.answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    return () => { if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current); };
  }, []);

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      {/* Hidden canvases */}
      <canvas ref={diffCanvasRef} className="hidden" />

      {/* ===== TOP BAR ===== */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 flex-shrink-0">
        <button onClick={() => navigate("/")} className="text-white/50 hover:text-cyan p-1">
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[9px] text-white/30 font-mono uppercase">Font</span>
          <input
            type="range" min={12} max={28} value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-14 h-1 accent-cyan"
          />
          <span className="text-cyan font-mono text-[10px] w-4">{fontSize}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {isRecording && (
            <span className="inline-flex items-center gap-1 text-[9px] font-mono text-red-500">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />REC
            </span>
          )}
          {(isProcessing || cameraProcessing) && (
            <span className="inline-flex items-center gap-1 text-[9px] font-mono text-cyan">
              <Loader2 className="w-3 h-3 animate-spin" />AI
            </span>
          )}
          {autoScan && scanStatus && (
            <span className="text-[9px] font-mono text-green-400">{scanStatus}</span>
          )}
        </div>
      </div>

      {/* ===== MAIN CONTENT AREA ===== */}
      <div className="flex-1 overflow-y-auto relative">

        {/* ===== CAMERA MINIATURE - TOP RIGHT ===== */}
        {cameraReady && (
          <div className="fixed top-12 right-2 z-30 flex flex-col items-end gap-1">
            {/* Video thumbnail */}
            <div className="w-28 h-20 rounded-lg overflow-hidden border border-cyan/30 bg-black shadow-lg shadow-cyan/10">
              <video
                ref={videoRef}
                autoPlay playsInline muted
                className="w-full h-full object-cover"
              />
            </div>
            {/* Lens + Auto-scan buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => switchLens("0.5x")}
                className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[9px] font-bold transition-all ${
                  lensMode === "0.5x" ? "bg-cyan text-black" : "bg-black/80 text-white/60 border border-white/20"
                }`}
              >.5</button>
              <button
                onClick={() => switchLens("1x")}
                className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[9px] font-bold transition-all ${
                  lensMode === "1x" ? "bg-cyan text-black" : "bg-black/80 text-white/60 border border-white/20"
                }`}
              >1x</button>
              <button
                onClick={() => setAutoScan((v) => !v)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  autoScan ? "bg-green-500 text-black" : "bg-black/80 text-white/60 border border-white/20"
                }`}
              >{autoScan ? <Scan className="w-3 h-3" /> : <ScanLine className="w-3 h-3" />}</button>
              <button
                onClick={captureAndProcess}
                disabled={cameraProcessing}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-cyan text-black transition-all hover:scale-110"
              >
                {cameraProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
              </button>
            </div>
          </div>
        )}

        {/* Video element (hidden when camera miniature is used) */}
        {!cameraReady && (
          <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        )}

        {/* ===== ANSWER ZONE - TOP (maximum space) ===== */}
        {result?.answer && (
          <div className="border-b border-cyan/20 bg-cyan/5 px-4 py-3">
            <div className="flex items-start justify-between gap-2 mb-1 pr-32">
              <span className="text-[10px] font-mono text-cyan/60 uppercase tracking-wider">
                ✦ Your Answer
              </span>
              <button onClick={copyAnswer} className="text-cyan/60 hover:text-cyan p-0.5 transition-colors">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-white font-medium leading-relaxed pr-32" style={{ fontSize: `${fontSize}px` }}>
              {result.answer}
            </p>
            {result.summaryPtBr && (
              <p className="text-cyan/50 text-xs font-mono mt-2 italic pr-32">
                → {result.summaryPtBr}
              </p>
            )}
          </div>
        )}

        {/* ===== TRANSCRIPTION ZONE ===== */}
        {result?.transcription && (
          <div className="border-b border-white/5 px-4 py-3">
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-1">
              Interviewer said
            </span>
            <p className="text-white/70 font-mono leading-relaxed pr-32" style={{ fontSize: `${Math.max(fontSize - 2, 12)}px` }}>
              {result.transcription}
            </p>
            {result.translation && (
              <p className="text-white/30 text-xs font-mono mt-1.5 italic pr-32">
                PT-BR: {result.translation}
              </p>
            )}
          </div>
        )}

        {/* ===== EMPTY STATE ===== */}
        {!result && !isProcessing && (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <button
              onClick={toggleRecording}
              className="w-20 h-20 rounded-full bg-cyan/10 border-2 border-cyan/30 flex items-center justify-center mb-4 active:scale-95 transition-transform"
            >
              <Mic className="w-8 h-8 text-cyan" />
            </button>
            <p className="text-cyan font-mono text-sm uppercase tracking-widest mb-1">
              Toque para iniciar
            </p>
            <p className="text-white/30 text-xs font-mono">
              {cameraReady ? "Microfone ativo • Câmera 4K ativa" : "Microfone + Câmera"}
            </p>
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && !result && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-cyan animate-spin mb-3" />
            <p className="text-cyan/60 font-mono text-xs uppercase tracking-wider">Processando...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-4 mt-2 bg-red-500/20 border border-red-500/30 rounded px-3 py-1.5">
            <p className="text-red-400 text-[10px] font-mono">{error}</p>
          </div>
        )}
      </div>

      {/* ===== BOTTOM CONTROLS (compact) ===== */}
      <div className="px-4 py-2 border-t border-white/5 flex items-center justify-center gap-4 flex-shrink-0 bg-black">
        {/* Camera toggle */}
        <button
          onClick={cameraReady ? () => {
            cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
            cameraStreamRef.current = null;
            setCameraReady(false);
            setAutoScan(false);
          } : () => startCameraWithLens(lensMode)}
          className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
            cameraReady ? "border-cyan bg-cyan/10 text-cyan" : "border-white/20 text-white/40"
          }`}
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Main record */}
        <button
          onClick={toggleRecording}
          disabled={isProcessing}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
            isRecording ? "bg-red-500" : isProcessing ? "bg-white/10 opacity-50" : "bg-cyan hover:scale-105"
          }`}
          style={isRecording ? { boxShadow: "0 0 20px rgba(239,68,68,0.5)" } : {}}
        >
          {isRecording ? <Square className="w-5 h-5 text-white" /> : <Mic className="w-6 h-6 text-black" />}
        </button>

        {/* Clear */}
        <button
          onClick={() => {
            setResult(null);
            setPreviousContext("");
            setError("");
            prevFrameDataRef.current = null;
            lastProcessedHashRef.current = "";
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center border border-white/20 text-white/40 hover:border-white/40 transition-all"
        >
          <span className="text-[10px] font-mono">CLR</span>
        </button>
      </div>
    </div>
  );
}
