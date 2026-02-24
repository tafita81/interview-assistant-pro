import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test.webm", url: "https://s3.example.com/test.webm" }),
}));

// Mock transcription
vi.mock("./_core/voiceTranscription", () => ({
  transcribeAudio: vi.fn().mockResolvedValue({ text: "Tell me about your experience with data engineering" }),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    id: "test",
    created: Date.now(),
    model: "test",
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: JSON.stringify({
          answer: "I have 5 years building data pipelines with Python, SQL, and cloud platforms.",
          translation: "Me conte sobre sua experiência com engenharia de dados"
        })
      },
      finish_reason: "stop",
    }]
  }),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("processAudioFast", () => {
  it("processes audio and returns transcription with answer", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.processAudioFast({
      audioBase64: Buffer.from("fake audio data").toString("base64"),
      mimeType: "audio/webm",
    });
    expect(result.answer).toBeTruthy();
    expect(result.translation).toBeTruthy();
    expect(result.transcription).toBeTruthy();
  });

  it("includes previousContext when provided", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.processAudioFast({
      audioBase64: Buffer.from("fake audio data").toString("base64"),
      mimeType: "audio/webm",
      previousContext: "Q: Tell me about yourself\nA: I have 18+ years in data.",
    });
    expect(result.answer).toBeTruthy();
  });
});

describe("generateAnswerFast", () => {
  it("generates answer for technical question", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.generateAnswerFast({
      question: "Write a SQL query to find duplicates",
      mode: "technical",
    });
    expect(result.answer).toBeTruthy();
  });

  it("generates answer for interview question", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.generateAnswerFast({
      question: "Tell me about yourself",
      mode: "interview",
    });
    expect(result.answer).toBeTruthy();
  });

  it("accepts optional context parameter", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.generateAnswerFast({
      question: "Can you elaborate?",
      context: "Q: Tell me about yourself\nA: I have 18+ years in data analytics.",
      mode: "interview",
    });
    expect(result.answer).toBeTruthy();
  });
});

describe("processImageFast", () => {
  it("processes image and returns direct answer", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.processImageFast({
      imageBase64: Buffer.from("fake image data").toString("base64"),
    });
    expect(result.answer).toBeTruthy();
  });

  it("accepts optional context parameter", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.processImageFast({
      imageBase64: Buffer.from("fake image data").toString("base64"),
      context: "Previous question context",
    });
    expect(result.answer).toBeTruthy();
  });
});
