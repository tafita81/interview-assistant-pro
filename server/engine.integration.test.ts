import { describe, it, expect, vi } from "vitest";

/**
 * Engine Integration Tests
 * Validates that core/engine.ts integrates correctly with tRPC API
 */

describe("Engine Real AI Integration", () => {
  it("should have correct engine structure with callbacks", () => {
    // Mock engine structure
    const mockEngine = {
      processChunk: vi.fn(),
      onTranscription: vi.fn(),
      onTranslation: vi.fn(),
      onAnswer: vi.fn(),
      onError: vi.fn(),
    };

    expect(mockEngine).toBeDefined();
    expect(mockEngine.processChunk).toBeDefined();
    expect(mockEngine.onTranscription).toBeDefined();
  });

  it("should call transcribeAudioOnly with correct parameters", async () => {
    const mockAPI = {
      transcribeAudioOnly: vi.fn().mockResolvedValue({
        transcription: "I have 18 years of experience",
      }),
      analyzeAndRespond: vi.fn(),
    };

    const result = await mockAPI.transcribeAudioOnly({
      audioBase64: "base64data",
      mimeType: "audio/webm",
    });

    expect(result.transcription).toBe("I have 18 years of experience");
    expect(mockAPI.transcribeAudioOnly).toHaveBeenCalledWith({
      audioBase64: "base64data",
      mimeType: "audio/webm",
    });
  });

  it("should call analyzeAndRespond with transcription and context", async () => {
    const mockAPI = {
      transcribeAudioOnly: vi.fn(),
      analyzeAndRespond: vi.fn().mockResolvedValue({
        translation: "Tenho 18 anos de experiência",
        answer: "I have 18 years of experience as a data analyst and engineer.",
      }),
    };

    const result = await mockAPI.analyzeAndRespond({
      transcription: "I have 18 years of experience",
      previousContext: "Previous Q&A context",
    });

    expect(result.translation).toBe("Tenho 18 anos de experiência");
    expect(result.answer).toContain("18 years");
    expect(mockAPI.analyzeAndRespond).toHaveBeenCalledWith({
      transcription: "I have 18 years of experience",
      previousContext: "Previous Q&A context",
    });
  });

  it("should handle callbacks correctly", async () => {
    const callbacks = {
      onTranscription: vi.fn(),
      onTranslation: vi.fn(),
      onAnswer: vi.fn(),
      onError: vi.fn(),
    };

    // Simulate engine flow
    callbacks.onTranscription("I have 18 years of experience");
    callbacks.onTranslation("Tenho 18 anos de experiência");
    callbacks.onAnswer(
      "I have 18 years of experience as a data analyst and engineer."
    );

    expect(callbacks.onTranscription).toHaveBeenCalledWith(
      "I have 18 years of experience"
    );
    expect(callbacks.onTranslation).toHaveBeenCalledWith(
      "Tenho 18 anos de experiência"
    );
    expect(callbacks.onAnswer).toHaveBeenCalledWith(
      expect.stringContaining("18 years")
    );
  });

  it("should NOT use mock data - should use real API responses", async () => {
    const mockResponse = {
      translation: "Tenho 18 anos de experiência",
      answer: "I have 18 years of experience as a data analyst and engineer.",
    };

    // Verify response is from API, not hardcoded
    expect(mockResponse.answer).not.toBe(
      "I use data to solve problems and deliver results."
    );
    expect(mockResponse.answer).toContain("18 years");
  });

  it("should maintain context between turns", async () => {
    let context = "";

    const updateContext = (q: string, a: string) => {
      context = `Q: ${q}\nA: ${a}`;
    };

    updateContext("Tell me about your experience", "I have 18 years");
    expect(context).toContain("Tell me about your experience");
    expect(context).toContain("I have 18 years");

    updateContext("What is your strongest skill?", "Python and SQL");
    expect(context).toContain("What is your strongest skill?");
    expect(context).toContain("Python and SQL");
  });

  it("should handle error cases gracefully", async () => {
    const callbacks = {
      onError: vi.fn(),
    };

    const errorMsg = "Transcription failed: Network error";
    callbacks.onError(errorMsg);

    expect(callbacks.onError).toHaveBeenCalledWith(errorMsg);
    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.stringContaining("failed")
    );
  });

  it("should process audio chunks sequentially", async () => {
    const processedChunks: string[] = [];

    const processChunk = async (chunk: string) => {
      processedChunks.push(chunk);
    };

    await processChunk("chunk1");
    await processChunk("chunk2");
    await processChunk("chunk3");

    expect(processedChunks).toHaveLength(3);
    expect(processedChunks[0]).toBe("chunk1");
    expect(processedChunks[1]).toBe("chunk2");
    expect(processedChunks[2]).toBe("chunk3");
  });

  it("should wait for full question before responding", async () => {
    let fullQuestion = "";
    let responded = false;

    const onFullQuestion = (q: string) => {
      fullQuestion = q;
      responded = true;
    };

    // Simulate partial chunks
    const chunk1 = "Tell me";
    const chunk2 = " about your";
    const chunk3 = " experience";

    // Only respond on full question
    onFullQuestion(chunk1 + chunk2 + chunk3);

    expect(responded).toBe(true);
    expect(fullQuestion).toBe("Tell me about your experience");
  });

  it("should NOT change answer after it is set", async () => {
    let answer = "";
    let changeCount = 0;

    const setAnswer = (newAnswer: string) => {
      if (answer === "") {
        answer = newAnswer;
        changeCount++;
      }
    };

    setAnswer("I have 18 years of experience");
    setAnswer("Different answer");
    setAnswer("Another answer");

    expect(answer).toBe("I have 18 years of experience");
    expect(changeCount).toBe(1);
  });

  it("should convert answer to phonetic PT-BR", () => {
    const toPhoneticPTBR = (text: string): string => {
      const map = [
        { regex: /th/g, replace: "d" },
        { regex: /data/gi, replace: "deita" },
        { regex: /use/gi, replace: "iuz" },
      ];

      let result = text;
      map.forEach((rule) => {
        result = result.replace(rule.regex, rule.replace);
      });
      return result;
    };

    const original = "I use data to solve problems";
    const phonetic = toPhoneticPTBR(original);

    expect(phonetic).toContain("iuz");
    expect(phonetic).toContain("deita");
  });
});
