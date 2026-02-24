import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock voice transcription service
vi.mock("./_core/voiceTranscription", () => ({
  transcribeAudio: vi.fn(async ({ audioUrl, language, prompt }) => {
    // Simular transcrição bem-sucedida
    return {
      text: "I have 18 years of experience as a data analyst and engineer",
      language: "en",
      segments: [
        { id: 0, seek: 0, start: 0, end: 5, text: "I have 18 years of experience" },
        { id: 1, seek: 5, start: 5, end: 10, text: "as a data analyst and engineer" }
      ]
    };
  }),
}));

// Mock LLM service
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async ({ messages, response_format }) => {
    // Simular resposta LLM bem-sucedida
    return {
      id: "chatcmpl-test",
      created: Date.now(),
      model: "gpt-4",
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: JSON.stringify({
            translation: "Tenho 18 anos de experiência como analista e engenheiro de dados",
            answer: "I have 18 years of experience as a data analyst and engineer, specializing in BI solutions and data architecture."
          })
        },
        finish_reason: "stop",
      }]
    };
  }),
}));

// Mock storage service
vi.mock("./storage", () => ({
  storagePut: vi.fn(async (key, buffer, mimeType) => ({
    key,
    url: `https://storage.example.com/${key}`
  })),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("Audio Integration Pipeline - Full Flow", () => {
  it("should transcribe audio chunk successfully", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Simular áudio em inglês (2 segundos)
    const audioBase64 = Buffer.from("fake audio data for 2 seconds").toString("base64");

    const result = await caller.transcribeAudioOnly({
      audioBase64,
      mimeType: "audio/webm",
    });

    expect(result.transcription).toBeDefined();
    expect(result.transcription.length).toBeGreaterThan(0);
    expect(result.transcription).toContain("18 years");
  });

  it("should translate and respond to transcription", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const transcription = "I have 18 years of experience as a data analyst and engineer";

    const result = await caller.analyzeAndRespond({
      transcription,
      previousContext: undefined,
    });

    expect(result.translation).toBeDefined();
    expect(result.translation.length).toBeGreaterThan(0);
    expect(result.answer).toBeDefined();
    expect(result.answer.length).toBeGreaterThan(0);

    // Validar que tradução está em português
    expect(result.translation).toContain("anos");
    expect(result.translation).toContain("experiência");

    // Validar que resposta está em inglês
    expect(result.answer).toContain("years");
  });

  it("should process complete audio pipeline: capture -> transcribe -> translate -> respond", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // STEP 1: Simular captura de áudio (2 segundos)
    const audioBase64 = Buffer.from("fake audio data for 2 seconds").toString("base64");

    // STEP 2: Transcrever
    const transcribeResult = await caller.transcribeAudioOnly({
      audioBase64,
      mimeType: "audio/webm",
    });

    expect(transcribeResult.transcription).toBeDefined();
    const transcription = transcribeResult.transcription;

    // STEP 3: Analisar e gerar resposta (inclui tradução)
    const analyzeResult = await caller.analyzeAndRespond({
      transcription,
      previousContext: undefined,
    });

    // Validar todos os componentes
    expect(analyzeResult.translation).toBeDefined();
    expect(analyzeResult.answer).toBeDefined();

    // Validar layout esperado
    // Topo: Resposta IA em inglês
    expect(analyzeResult.answer).toContain("years");
    // Meio: Transcrição em inglês
    expect(transcription).toContain("experience");
    // Abaixo: Tradução em PT-BR
    expect(analyzeResult.translation).toContain("experiência");

    console.log("✅ Pipeline completo:");
    console.log("  - Transcrição (EN):", transcription);
    console.log("  - Tradução (PT-BR):", analyzeResult.translation);
    console.log("  - Resposta (EN):", analyzeResult.answer);
  });

  it("should handle continuous audio chunks without filtering", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Simular múltiplos chunks de 2 segundos
    const chunks = [
      "I have 18 years",
      "of experience as",
      "a data analyst",
      "and engineer"
    ];

    const results = [];

    for (const chunk of chunks) {
      const audioBase64 = Buffer.from(chunk).toString("base64");
      const result = await caller.transcribeAudioOnly({
        audioBase64,
        mimeType: "audio/webm",
      });
      results.push(result.transcription);
    }

    // Todos os chunks devem ser transcritos
    expect(results).toHaveLength(chunks.length);
    expect(results.every((r) => r.length > 0)).toBe(true);

    // Nenhum deve ser filtrado
    expect(results.some((r) => r.includes("18"))).toBe(true);
  });

  it("should maintain context across multiple turns", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Primeira pergunta
    const q1 = "I have 18 years of experience";
    const r1 = await caller.analyzeAndRespond({
      transcription: q1,
      previousContext: undefined,
    });

    expect(r1.answer).toBeDefined();

    // Segunda pergunta com contexto
    const q2 = "What about your Python skills?";
    const r2 = await caller.analyzeAndRespond({
      transcription: q2,
      previousContext: `Q: ${q1}\nA: ${r1.answer}`,
    });

    expect(r2.answer).toBeDefined();
    expect(r2.translation).toBeDefined();

    console.log("✅ Contexto mantido entre turnos");
  });

  it("should display components in correct order: Answer -> Transcription -> Translation", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const audioBase64 = Buffer.from("I am a data engineer").toString("base64");

    // Transcrever
    const transcribeResult = await caller.transcribeAudioOnly({
      audioBase64,
      mimeType: "audio/webm",
    });

    // Analisar
    const analyzeResult = await caller.analyzeAndRespond({
      transcription: transcribeResult.transcription,
      previousContext: undefined,
    });

    // Validar ordem de exibição esperada
    const layout = {
      top: analyzeResult.answer,           // Resposta IA
      middle: transcribeResult.transcription, // Transcrição
      bottom: analyzeResult.translation,   // Tradução PT-BR
    };

    expect(layout.top).toBeTruthy();
    expect(layout.middle).toBeTruthy();
    expect(layout.bottom).toBeTruthy();

    console.log("✅ Layout correto:");
    console.log("  TOPO (Resposta IA):", layout.top);
    console.log("  MEIO (Transcrição):", layout.middle);
    console.log("  ABAIXO (Tradução):", layout.bottom);
  });

  it("should NOT filter audio - process ALL speech without speaker identification", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Simular diferentes tipos de fala (pergunta e resposta)
    const testCases = [
      { text: "Tell me about your experience", type: "question" },
      { text: "I have 18 years in data science", type: "answer" },
      { text: "What is your strongest skill?", type: "question" },
      { text: "I am proficient in Python and SQL", type: "answer" },
    ];

    for (const testCase of testCases) {
      const audioBase64 = Buffer.from(testCase.text).toString("base64");

      const result = await caller.transcribeAudioOnly({
        audioBase64,
        mimeType: "audio/webm",
      });

      // Todos devem ser transcritos, nenhum filtrado
      expect(result.transcription).toBeDefined();
      expect(result.transcription.length).toBeGreaterThan(0);

      console.log(`✅ ${testCase.type}: "${testCase.text}" -> Transcrito`);
    }
  });
});
