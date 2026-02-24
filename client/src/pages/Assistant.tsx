import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Copy, Check, Camera, Scan, ScanLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

type ProcessResult = {
  transcription: string;
  translation: string;
  answer: string;
  summaryPtBr: string;
};

type LensMode = "0.5x" | "1x";

// ===== FRAME DIFF =====
function computeFrameDiff(prev: Uint8ClampedArray, curr: Uint8ClampedArray, step: number): number {
  let diff = 0, count = 0;
  for (let i = 0; i < prev.length; i += 4 * step) {
    diff += (Math.abs(prev[i] - curr[i]) + Math.abs(prev[i+1] - curr[i+1]) + Math.abs(prev[i+2] - curr[i+2])) / 3;
    count++;
  }
  return count > 0 ? diff / count : 0;
}

export default function Assistant() {
  const [, navigate] = useLocation();
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [previousContext, setPreviousContext] = useState("");
  const [fontSize, setFontSize] = useState(16);
  const [copied, setCopied] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraProcessing, setCameraProcessing] = useState(false);
  const [error, setError] = useState("");
  const [lensMode, setLensMode] = useState<LensMode>("1x");
  const [autoScan, setAutoScan] = useState(true); // ON by default
  const [scanStatus, setScanStatus] = useState("");
  const [audioActive, setAudioActive] = useState(false);
  const [audioStatus, setAudioStatus] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const diffCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const autoScanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingImageRef = useRef(false);
  const lastProcessedHashRef = useRef("");
  const previousContextRef = useRef("");

  // Audio continuous recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const isProcessingAudioRef = useRef(false);
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { previousContextRef.current = previousContext; }, [previousContext]);

  const uploadAudio = trpc.uploadAudio.useMutation();
  const processAudio = trpc.processAudio.useMutation();
  const processImage = trpc.processImage.useMutation();

  // ===== FORCE LANDSCAPE =====
  useEffect(() => {
    try { (screen.orientation as any)?.lock?.("landscape").catch(() => {}); } catch {}
    return () => { try { (screen.orientation as any)?.unlock?.(); } catch {} };
  }, []);

  // ===== CAMERA SETUP =====
  const startCameraWithLens = useCallback(async (lens: LensMode) => {
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
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
      cameraStreamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const caps = track.getCapabilities() as any;
          if (caps?.zoom) {
            const z = lens === "0.5x" ? caps.zoom.min : Math.min(1, caps.zoom.max);
            await track.applyConstraints({ advanced: [{ zoom: z }] } as any);
          }
        } catch {}
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current?.play().catch(() => {});
      }
      setCameraReady(true);
    } catch { setError("Erro câmera."); }
  }, []);

  const switchLens = useCallback(async (lens: LensMode) => {
    if (lens === lensMode && cameraReady) return;
    setLensMode(lens);
    await startCameraWithLens(lens);
  }, [lensMode, cameraReady, startCameraWithLens]);

  // ===== AUTO-START CAMERA ON MOUNT =====
  useEffect(() => {
    let cancelled = false;
    (async () => {
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
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => videoRef.current?.play().catch(() => {});
        }
        setCameraReady(true);
      } catch {}
    })();
    return () => { cancelled = true; cameraStreamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  // ===== AUTO-SCAN: CONTINUOUS VIDEO OCR =====
  const captureFrame = useCallback((): { data: Uint8ClampedArray; base64: string } | null => {
    if (!videoRef.current || !diffCanvasRef.current) return null;
    const v = videoRef.current, c = diffCanvasRef.current;
    const w = v.videoWidth || 3840, h = v.videoHeight || 2160;
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, w, h);
    return { data: ctx.getImageData(0, 0, w, h).data, base64: c.toDataURL("image/jpeg", 0.92).split(",")[1] };
  }, []);

  const processFrameIfChanged = useCallback(async () => {
    if (isProcessingImageRef.current) return;
    const frame = captureFrame();
    if (!frame) return;
    if (prevFrameDataRef.current) {
      if (computeFrameDiff(prevFrameDataRef.current, frame.data, 20) < 8) return;
    }
    let hash = 0;
    for (let i = 0; i < frame.data.length; i += 400) hash = ((hash << 5) - hash + frame.data[i]) | 0;
    if (hash.toString() === lastProcessedHashRef.current) return;

    prevFrameDataRef.current = new Uint8ClampedArray(frame.data);
    lastProcessedHashRef.current = hash.toString();
    isProcessingImageRef.current = true;
    setCameraProcessing(true);
    setScanStatus("Detectado...");
    try {
      const res = await processImage.mutateAsync({ imageBase64: frame.base64, context: previousContextRef.current || undefined });
      setResult(prev => ({ transcription: prev?.transcription || "", translation: prev?.translation || "", answer: res.answer, summaryPtBr: res.summaryPtBr }));
      setScanStatus("✓");
    } catch { setScanStatus("Erro"); }
    finally { isProcessingImageRef.current = false; setCameraProcessing(false); }
  }, [captureFrame]);

  useEffect(() => {
    if (autoScan && cameraReady) {
      setScanStatus("Monitorando...");
      autoScanIntervalRef.current = setInterval(() => processFrameIfChanged(), 2000);
    } else {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
      autoScanIntervalRef.current = null;
      setScanStatus("");
      prevFrameDataRef.current = null;
      lastProcessedHashRef.current = "";
    }
    return () => { if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current); };
  }, [autoScan, cameraReady, processFrameIfChanged]);

  // ===== CONTINUOUS AUDIO CAPTURE =====
  // Records in chunks (every ~8 seconds), sends each chunk for transcription automatically
  const processAudioChunk = useCallback(async (blob: Blob, mimeType: string) => {
    if (blob.size < 1000) return; // Skip tiny/silent chunks
    if (isProcessingAudioRef.current) return;
    isProcessingAudioRef.current = true;
    setIsProcessingAudio(true);
    setAudioStatus("Transcrevendo...");
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const cleanMime = mimeType.split(";")[0] || "audio/webm";
      const { url } = await uploadAudio.mutateAsync({ audioBase64: base64, mimeType: cleanMime });
      const data = await processAudio.mutateAsync({ audioUrl: url, previousContext: previousContextRef.current || undefined });

      // Only update if there's actual content
      if (data.transcription && data.transcription.trim().length > 3) {
        setResult(data);
        setPreviousContext(prev => prev
          ? `${prev}\nQ: ${data.transcription}\nA: ${data.answer}`
          : `Q: ${data.transcription}\nA: ${data.answer}`
        );
        setAudioStatus("✓ Resposta pronta");
      } else {
        setAudioStatus("Ouvindo...");
      }
    } catch {
      setAudioStatus("Erro, tentando...");
    } finally {
      isProcessingAudioRef.current = false;
      setIsProcessingAudio(false);
    }
  }, []);

  const startContinuousAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      audioStreamRef.current = stream;

      let mimeType = "audio/webm;codecs=opus";
      if (typeof MediaRecorder !== "undefined") {
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "audio/webm";
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "audio/mp4";
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "";
      }

      const startNewRecorder = () => {
        if (!audioStreamRef.current) return;
        const options: MediaRecorderOptions = {};
        if (mimeType) options.mimeType = mimeType;
        const recorder = new MediaRecorder(audioStreamRef.current, options);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          const actualMime = recorder.mimeType || mimeType || "audio/webm";
          const blob = new Blob(chunks, { type: actualMime });
          processAudioChunk(blob, actualMime);
        };

        recorder.start(500); // Collect data every 500ms
        mediaRecorderRef.current = recorder;

        // Stop after 8 seconds and start a new one
        return recorder;
      };

      // Start first recorder
      startNewRecorder();

      // Every 8 seconds: stop current, start new (continuous loop)
      audioIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
        // Small delay then start new
        setTimeout(() => startNewRecorder(), 200);
      }, 8000);

      setAudioActive(true);
      setAudioStatus("Ouvindo...");
    } catch {
      setError("Erro microfone.");
    }
  }, [processAudioChunk]);

  const stopContinuousAudio = useCallback(() => {
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    audioIntervalRef.current = null;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    audioStreamRef.current?.getTracks().forEach(t => t.stop());
    audioStreamRef.current = null;
    mediaRecorderRef.current = null;
    setAudioActive(false);
    setAudioStatus("");
  }, []);

  // ===== AUTO-START AUDIO ON MOUNT =====
  useEffect(() => {
    // Small delay to let camera permissions settle first
    const timer = setTimeout(() => startContinuousAudio(), 1500);
    return () => {
      clearTimeout(timer);
      stopContinuousAudio();
    };
  }, []);

  // ===== MANUAL CAPTURE =====
  const captureAndProcess = useCallback(async () => {
    if (!videoRef.current || !diffCanvasRef.current) return;
    setCameraProcessing(true);
    const v = videoRef.current, c = diffCanvasRef.current;
    c.width = v.videoWidth || 3840; c.height = v.videoHeight || 2160;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const base64 = c.toDataURL("image/jpeg", 0.92).split(",")[1];
    try {
      const data = await processImage.mutateAsync({ imageBase64: base64, context: previousContext || undefined });
      setResult(prev => ({ transcription: prev?.transcription || "", translation: prev?.translation || "", answer: data.answer, summaryPtBr: data.summaryPtBr }));
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, []);

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      <canvas ref={diffCanvasRef} className="hidden" />

      {/* ===== TOP BAR (compact) ===== */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 flex-shrink-0">
        <button onClick={() => navigate("/")} className="text-white/50 hover:text-cyan p-1">
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[9px] text-white/30 font-mono uppercase">Font</span>
          <input type="range" min={12} max={28} value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-14 h-1 accent-cyan" />
          <span className="text-cyan font-mono text-[10px] w-4">{fontSize}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Audio status */}
          {audioActive && (
            <span className="inline-flex items-center gap-1 text-[9px] font-mono text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {audioStatus || "MIC"}
            </span>
          )}
          {isProcessingAudio && (
            <span className="inline-flex items-center gap-1 text-[9px] font-mono text-cyan">
              <Loader2 className="w-3 h-3 animate-spin" />AI
            </span>
          )}
          {cameraProcessing && (
            <span className="inline-flex items-center gap-1 text-[9px] font-mono text-yellow-400">
              <Loader2 className="w-3 h-3 animate-spin" />OCR
            </span>
          )}
          {autoScan && !cameraProcessing && cameraReady && (
            <span className="text-[9px] font-mono text-green-400/60">
              <Scan className="w-3 h-3 inline" /> AUTO
            </span>
          )}
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 overflow-y-auto relative">

        {/* ===== CAMERA MINIATURE - TOP RIGHT ===== */}
        {cameraReady && (
          <div className="fixed top-12 right-2 z-30 flex flex-col items-end gap-1">
            <div className="w-28 h-20 rounded-lg overflow-hidden border border-cyan/30 bg-black shadow-lg shadow-cyan/10">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => switchLens("0.5x")}
                className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[9px] font-bold ${
                  lensMode === "0.5x" ? "bg-cyan text-black" : "bg-black/80 text-white/60 border border-white/20"
                }`}>.5</button>
              <button onClick={() => switchLens("1x")}
                className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[9px] font-bold ${
                  lensMode === "1x" ? "bg-cyan text-black" : "bg-black/80 text-white/60 border border-white/20"
                }`}>1x</button>
              <button onClick={() => setAutoScan(v => !v)}
                className={`w-7 h-7 rounded-full flex items-center justify-center ${
                  autoScan ? "bg-green-500 text-black" : "bg-black/80 text-white/60 border border-white/20"
                }`}>{autoScan ? <Scan className="w-3 h-3" /> : <ScanLine className="w-3 h-3" />}</button>
              <button onClick={captureAndProcess} disabled={cameraProcessing}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-cyan text-black hover:scale-110">
                {cameraProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
              </button>
            </div>
          </div>
        )}

        {/* Hidden video when camera not ready */}
        {!cameraReady && <video ref={videoRef} autoPlay playsInline muted className="hidden" />}

        {/* ===== ANSWER ZONE - TOP ===== */}
        {result?.answer && (
          <div className="border-b border-cyan/20 bg-cyan/5 px-4 py-3">
            <div className="flex items-start justify-between gap-2 mb-1 pr-32">
              <span className="text-[10px] font-mono text-cyan/60 uppercase tracking-wider">✦ Your Answer</span>
              <button onClick={copyAnswer} className="text-cyan/60 hover:text-cyan p-0.5">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-white font-medium leading-relaxed pr-32" style={{ fontSize: `${fontSize}px` }}>
              {result.answer}
            </p>
            {result.summaryPtBr && (
              <p className="text-cyan/50 text-xs font-mono mt-2 italic pr-32">→ {result.summaryPtBr}</p>
            )}
          </div>
        )}

        {/* ===== TRANSCRIPTION ZONE ===== */}
        {result?.transcription && (
          <div className="border-b border-white/5 px-4 py-3">
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider block mb-1">Interviewer said</span>
            <p className="text-white/70 font-mono leading-relaxed pr-32" style={{ fontSize: `${Math.max(fontSize - 2, 12)}px` }}>
              {result.transcription}
            </p>
            {result.translation && (
              <p className="text-white/30 text-xs font-mono mt-1.5 italic pr-32">PT-BR: {result.translation}</p>
            )}
          </div>
        )}

        {/* ===== WAITING STATE ===== */}
        {!result && !isProcessingAudio && (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mb-4 animate-pulse">
              <span className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <p className="text-green-400 font-mono text-sm uppercase tracking-widest mb-1">
              Captando em tempo real
            </p>
            <p className="text-white/30 text-xs font-mono">
              {audioActive ? "Microfone ativo" : "Iniciando microfone..."} • {cameraReady ? "Câmera 4K ativa" : "Iniciando câmera..."}
            </p>
          </div>
        )}

        {/* Processing */}
        {isProcessingAudio && !result && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-cyan animate-spin mb-3" />
            <p className="text-cyan/60 font-mono text-xs uppercase tracking-wider">Processando áudio...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-4 mt-2 bg-red-500/20 border border-red-500/30 rounded px-3 py-1.5">
            <p className="text-red-400 text-[10px] font-mono">{error}</p>
          </div>
        )}
      </div>

      {/* ===== BOTTOM CONTROLS (minimal) ===== */}
      <div className="px-4 py-2 border-t border-white/5 flex items-center justify-center gap-4 flex-shrink-0 bg-black">
        {/* Toggle mic */}
        <button
          onClick={audioActive ? stopContinuousAudio : startContinuousAudio}
          className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
            audioActive ? "border-green-400 bg-green-400/10 text-green-400" : "border-white/20 text-white/40"
          }`}
        >
          <span className="text-[9px] font-mono font-bold">{audioActive ? "MIC" : "OFF"}</span>
        </button>

        {/* Toggle camera */}
        <button
          onClick={cameraReady ? () => {
            cameraStreamRef.current?.getTracks().forEach(t => t.stop());
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

        {/* Clear */}
        <button
          onClick={() => {
            setResult(null);
            setPreviousContext("");
            setError("");
            prevFrameDataRef.current = null;
            lastProcessedHashRef.current = "";
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center border border-white/20 text-white/40 hover:border-white/40"
        >
          <span className="text-[9px] font-mono">CLR</span>
        </button>
      </div>
    </div>
  );
}
