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
// Compare two ImageData pixel arrays to detect if screen changed
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
  const [switchingLens, setSwitchingLens] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [scanStatus, setScanStatus] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const diffCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const autoScanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingRef = useRef(false);
  const lastProcessedHashRef = useRef("");
  const previousContextRef = useRef("");

  // Keep ref in sync with state
  useEffect(() => {
    previousContextRef.current = previousContext;
  }, [previousContext]);

  const uploadAudio = trpc.uploadAudio.useMutation();
  const processAudio = trpc.processAudio.useMutation();
  const processImage = trpc.processImage.useMutation();

  // ===== CAMERA: 4K VIDEO CONSTRAINTS =====
  const getVideoConstraints = useCallback((lens: LensMode): MediaTrackConstraints => {
    // Always request maximum 4K resolution for video stream
    const base: MediaTrackConstraints = {
      facingMode: { ideal: "environment" },
      width: { ideal: 3840, min: 1920 },
      height: { ideal: 2160, min: 1080 },
      frameRate: { ideal: 30, max: 60 },
    };

    if (lens === "0.5x") {
      return {
        ...base,
        // @ts-ignore
        zoom: { ideal: 0.5 },
        advanced: [{ zoom: 0.5 } as any],
      };
    }
    return base;
  }, []);

  const startCameraWithLens = useCallback(async (lens: LensMode) => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;

    try {
      const constraints = getVideoConstraints(lens);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: constraints,
        audio: false,
      });

      cameraStreamRef.current = stream;

      // Apply zoom via track capabilities
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const capabilities = videoTrack.getCapabilities() as any;
          if (capabilities?.zoom) {
            const targetZoom = lens === "0.5x"
              ? capabilities.zoom.min
              : Math.min(1, capabilities.zoom.max);
            await videoTrack.applyConstraints({
              // @ts-ignore
              advanced: [{ zoom: targetZoom }],
            });
          }
        } catch {
          // Zoom not supported
        }

        // Log actual resolution
        const settings = videoTrack.getSettings();
        console.log(`Camera: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
      }

      setCameraReady(true);
      setError("");
    } catch (err: any) {
      console.error("Camera error:", err);
      setError("Erro ao acessar câmera.");
    }
  }, [getVideoConstraints]);

  const switchLens = useCallback(async (lens: LensMode) => {
    if (lens === lensMode && cameraReady) return;
    setSwitchingLens(true);
    setLensMode(lens);
    await startCameraWithLens(lens);
    setSwitchingLens(false);
  }, [lensMode, cameraReady, startCameraWithLens]);

  // ===== AUTO-START CAMERA ON MOUNT (4K) =====
  useEffect(() => {
    let cancelled = false;

    const initCamera = async () => {
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
        setError("");
      } catch (err: any) {
        console.error("Camera init error:", err);
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

  // ===== AUTO-SCAN: CONTINUOUS OCR WITH DEDUP =====
  const captureFrameForDiff = useCallback((): { data: Uint8ClampedArray; base64: string } | null => {
    if (!videoRef.current || !diffCanvasRef.current) return null;
    const video = videoRef.current;
    const canvas = diffCanvasRef.current;

    // Use full video resolution for OCR quality
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
    if (isProcessingRef.current) return; // Skip if already processing

    const frame = captureFrameForDiff();
    if (!frame) return;

    const { data, base64 } = frame;

    // Check if frame changed significantly
    if (prevFrameDataRef.current) {
      // Sample every 20th pixel for speed
      const diff = computeFrameDiff(prevFrameDataRef.current, data, 20);
      if (diff < 8) {
        // Frame hasn't changed enough, skip
        return;
      }
    }

    // Simple hash to avoid reprocessing same content
    // Use a lightweight hash of sampled pixels
    let hash = 0;
    for (let i = 0; i < data.length; i += 400) {
      hash = ((hash << 5) - hash + data[i]) | 0;
    }
    const hashStr = hash.toString();

    if (hashStr === lastProcessedHashRef.current) {
      return; // Same content, skip
    }

    // Frame changed! Process it
    prevFrameDataRef.current = new Uint8ClampedArray(data);
    lastProcessedHashRef.current = hashStr;
    isProcessingRef.current = true;
    setCameraProcessing(true);
    setScanStatus("Mudança detectada...");

    try {
      const result = await processImage.mutateAsync({
        imageBase64: base64,
        context: previousContextRef.current || undefined,
      });

      setResult({
        transcription: "",
        translation: "",
        answer: result.answer,
        summaryPtBr: result.summaryPtBr,
      });
      setScanStatus("✓ Atualizado");
    } catch (err: any) {
      console.error("Auto-scan error:", err);
      setScanStatus("Erro, tentando...");
    } finally {
      isProcessingRef.current = false;
      setCameraProcessing(false);
    }
  }, [captureFrameForDiff]);

  // Start/stop auto-scan interval
  useEffect(() => {
    if (autoScan && cameraReady) {
      setScanStatus("Monitorando...");
      // Check for changes every 2 seconds
      autoScanIntervalRef.current = setInterval(() => {
        processFrameIfChanged();
      }, 2000);
    } else {
      if (autoScanIntervalRef.current) {
        clearInterval(autoScanIntervalRef.current);
        autoScanIntervalRef.current = null;
      }
      setScanStatus("");
      prevFrameDataRef.current = null;
      lastProcessedHashRef.current = "";
    }

    return () => {
      if (autoScanIntervalRef.current) {
        clearInterval(autoScanIntervalRef.current);
        autoScanIntervalRef.current = null;
      }
    };
  }, [autoScan, cameraReady, processFrameIfChanged]);

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

      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "audio/mp4";
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "";

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
      setError("Erro ao acessar microfone.");
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
          const r = reader.result as string;
          resolve(r.split(",")[1]);
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
      setError("Erro ao processar áudio.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ===== MANUAL CAMERA CAPTURE =====
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
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
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

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
    };
  }, []);

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
          {(isProcessing || cameraProcessing) && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan">
              <Loader2 className="w-3 h-3 animate-spin" />
              AI
            </span>
          )}
          {autoScan && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-green-400">
              <Scan className="w-3 h-3" />
              AUTO
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

      {/* ===== CAMERA PREVIEW (4K VIDEO) ===== */}
      <div className="flex-1 relative bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover absolute inset-0 ${cameraReady ? "opacity-100" : "opacity-0"}`}
        />
        {/* Hidden canvases for processing */}
        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={diffCanvasRef} className="hidden" />

        {/* Lens switching overlay */}
        {switchingLens && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
            <Loader2 className="w-6 h-6 text-cyan animate-spin" />
          </div>
        )}

        {/* ===== LENS SELECTOR + AUTO-SCAN ===== */}
        {cameraReady && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
            <button
              onClick={() => switchLens("0.5x")}
              disabled={switchingLens}
              className={`w-11 h-11 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                lensMode === "0.5x"
                  ? "bg-cyan text-black scale-110"
                  : "bg-black/60 text-white/70 border border-white/30 hover:border-white/60"
              }`}
            >
              .5
            </button>
            <button
              onClick={() => switchLens("1x")}
              disabled={switchingLens}
              className={`w-11 h-11 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                lensMode === "1x"
                  ? "bg-cyan text-black scale-110"
                  : "bg-black/60 text-white/70 border border-white/30 hover:border-white/60"
              }`}
            >
              1x
            </button>
            {/* Auto-scan toggle */}
            <button
              onClick={() => setAutoScan((v) => !v)}
              className={`w-11 h-11 rounded-full flex items-center justify-center font-mono text-[9px] font-bold transition-all ${
                autoScan
                  ? "bg-green-500 text-black scale-110"
                  : "bg-black/60 text-white/70 border border-white/30 hover:border-white/60"
              }`}
            >
              {autoScan ? <Scan className="w-4 h-4" /> : <ScanLine className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Scan status */}
        {autoScan && scanStatus && (
          <div className="absolute top-2 left-2 bg-black/70 rounded px-2 py-0.5 z-10">
            <p className="text-green-400 text-[10px] font-mono">{scanStatus}</p>
          </div>
        )}

        {/* Manual capture button */}
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

        {/* Center overlay when no camera */}
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
            setAutoScan(false);
          } : () => startCameraWithLens(lensMode)}
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
            prevFrameDataRef.current = null;
            lastProcessedHashRef.current = "";
          }}
          className="w-12 h-12 rounded-full flex items-center justify-center border border-white/20 text-white/40 hover:border-white/40 transition-all"
        >
          <span className="text-xs font-mono">CLR</span>
        </button>
      </div>
    </div>
  );
}
