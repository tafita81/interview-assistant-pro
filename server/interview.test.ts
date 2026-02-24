import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the external dependencies
vi.mock("./_core/voiceTranscription", () => ({
  transcribeAudio: vi.fn().mockResolvedValue({
    text: "Tell me about your experience with data analytics",
    language: "en",
    duration: 5.2,
    task: "transcribe",
    segments: [],
  }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    id: "test",
    created: Date.now(),
    model: "test",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "I have 18+ years delivering end-to-end BI and analytics solutions across industries like telecom, FMCG, and consulting.",
        },
        finish_reason: "stop",
      },
    ],
  }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: "audio/test.webm",
    url: "https://storage.example.com/audio/test.webm",
  }),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Interview Assistant API", () => {
  it("uploadAudio: uploads audio and returns URL", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.uploadAudio({
      audioBase64: Buffer.from("fake audio data").toString("base64"),
      mimeType: "audio/webm",
    });

    expect(result).toHaveProperty("url");
    expect(typeof result.url).toBe("string");
    expect(result.url.length).toBeGreaterThan(0);
  });

  it("processAudio: transcribes, translates and generates answer", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.processAudio({
      audioUrl: "https://storage.example.com/audio/test.webm",
    });

    expect(result).toHaveProperty("transcription");
    expect(result).toHaveProperty("translation");
    expect(result).toHaveProperty("answer");
    expect(result).toHaveProperty("summaryPtBr");
    expect(typeof result.transcription).toBe("string");
    expect(typeof result.answer).toBe("string");
    expect(result.transcription.length).toBeGreaterThan(0);
    expect(result.answer.length).toBeGreaterThan(0);
  });

  it("generateAnswer: generates answer for interview mode", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.generateAnswer({
      question: "What is your experience with Power BI?",
      mode: "interview",
    });

    expect(result).toHaveProperty("answer");
    expect(result).toHaveProperty("summaryPtBr");
    expect(typeof result.answer).toBe("string");
    expect(result.answer.length).toBeGreaterThan(0);
  });

  it("generateAnswer: generates answer for technical mode", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.generateAnswer({
      question: "Write a SQL query to find duplicate rows in a table",
      mode: "technical",
    });

    expect(result).toHaveProperty("answer");
    expect(result).toHaveProperty("summaryPtBr");
    expect(typeof result.answer).toBe("string");
    expect(result.answer.length).toBeGreaterThan(0);
  });

  it("processImage: processes image and returns answer", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.processImage({
      imageBase64: Buffer.from("fake image data").toString("base64"),
    });

    expect(result).toHaveProperty("answer");
    expect(result).toHaveProperty("summaryPtBr");
    expect(typeof result.answer).toBe("string");
    expect(result.answer.length).toBeGreaterThan(0);
  });

  it("generateAnswer: accepts optional context parameter", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.generateAnswer({
      question: "Can you elaborate on that?",
      context: "Q: Tell me about yourself\nA: I have 18+ years in data analytics.",
      mode: "interview",
    });

    expect(result).toHaveProperty("answer");
    expect(result.answer.length).toBeGreaterThan(0);
  });
});
