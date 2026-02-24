import { useLocation } from "wouter";
import { Mic, Code, Zap, Shield } from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.9 0.15 194 / 0.3) 1px, transparent 1px), linear-gradient(90deg, oklch(0.9 0.15 194 / 0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, oklch(0.9 0.15 194) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 text-center px-6 max-w-lg w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan/30 bg-cyan/5 mb-6">
          <Zap className="w-3.5 h-3.5 text-cyan" />
          <span className="text-cyan text-xs font-mono tracking-widest uppercase">
            Interview 2026
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 font-sans tracking-tight">
          Assistant <span className="text-cyan">Pro</span>
        </h1>

        {/* Subtitle */}
        <p className="text-white/50 text-sm font-mono mb-10 leading-relaxed">
          Áudio em tempo real + OCR + Respostas instantâneas.
          <br />
          Entrevistas e provas técnicas.
        </p>

        {/* Main button - Interview mode */}
        <button
          onClick={() => navigate("/assistant")}
          className="w-full py-4 px-6 rounded-lg font-semibold text-sm tracking-wide uppercase flex items-center justify-center gap-3 mb-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, oklch(0.9 0.15 194), oklch(0.85 0.2 155))",
            color: "#000",
          }}
        >
          <Mic className="w-5 h-5" />
          <div className="text-left">
            <div>Iniciar Entrevista</div>
            <div className="text-[10px] font-normal opacity-70 normal-case tracking-normal">
              Áudio + Transcrição + Resposta em tempo real
            </div>
          </div>
        </button>

        {/* Secondary button - Tech test mode */}
        <button
          onClick={() => navigate("/tech")}
          className="w-full py-4 px-6 rounded-lg font-semibold text-sm tracking-wide uppercase flex items-center justify-center gap-3 border border-dashed border-white/20 text-white/80 hover:border-cyan/40 hover:text-cyan transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] mb-8"
        >
          <Code className="w-5 h-5" />
          <div className="text-left">
            <div>Prova Técnica</div>
            <div className="text-[10px] font-normal opacity-50 normal-case tracking-normal">
              SQL, Python, código — Resposta direta para copiar
            </div>
          </div>
        </button>

        {/* Stats */}
        <div className="flex justify-center gap-8 text-center mb-6">
          <div>
            <div className="text-cyan font-bold text-lg font-mono">18+</div>
            <div className="text-white/30 text-[10px] uppercase tracking-wider">Anos Exp.</div>
          </div>
          <div>
            <div className="text-cyan font-bold text-lg font-mono">2</div>
            <div className="text-white/30 text-[10px] uppercase tracking-wider">Modos</div>
          </div>
          <div>
            <div className="text-cyan font-bold text-lg font-mono">∞</div>
            <div className="text-white/30 text-[10px] uppercase tracking-wider">Respostas</div>
          </div>
        </div>

        {/* Footer note */}
        <div className="flex items-center justify-center gap-2 text-white/20 text-[10px] font-mono">
          <Shield className="w-3 h-3" />
          <span>Baseado no resume de Rafael Rodrigues</span>
        </div>
      </div>
    </div>
  );
}
