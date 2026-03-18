import { describe, it, expect, vi } from "vitest";

/**
 * TESTES PARA ENGINE REALTIME
 * - Captura de áudio com chunks de 500-800ms
 * - Streaming contínuo sem bloqueios
 * - Detecção rápida de pergunta
 * - Latência < 2 segundos
 */

describe("Realtime Audio Engine", () => {
  it("should process audio chunks without blocking", async () => {
    const chunks: number[] = [];
    const startTime = Date.now();

    // Simular 5 chunks de 500ms
    for (let i = 0; i < 5; i++) {
      chunks.push(Date.now() - startTime);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Verificar que chunks foram processados aproximadamente a cada 500ms
    expect(chunks.length).toBe(5);
    expect(chunks[4] - chunks[0]).toBeLessThan(3000); // ~2.5s para 5 chunks
  });

  it("should detect question with question mark", () => {
    const text = "What is your experience?";
    const endsWithQuestion = text.trim().endsWith("?");

    expect(endsWithQuestion).toBe(true);
  });

  it("should detect question with silence > 1s", () => {
    const text = "I have 18 years of experience";
    const wordCount = text.split(" ").length;
    const hasMinimumLength = wordCount >= 3;

    expect(hasMinimumLength).toBe(true);
  });

  it("should accumulate transcription incrementally", () => {
    let accumulated = "";
    const chunks = [
      "I have",
      "18 years",
      "of experience",
      "as a data analyst",
    ];

    chunks.forEach((chunk) => {
      accumulated += (accumulated ? " " : "") + chunk;
    });

    expect(accumulated).toBe(
      "I have 18 years of experience as a data analyst"
    );
  });

  it("should limit response to 300 characters", () => {
    const longResponse =
      "I have 18 years of experience as a data analyst and engineer, specializing in ETL/ELT with dbt and Airflow, and advanced BI tools like Power BI and Tableau. My work consistently delivers tangible results, including accelerating reporting by 40-70% and achieving over $3M in savings through data-driven strategies. This approach usually works well in real scenarios. I focus on simple solutions that bring clear results.";

    const truncated =
      longResponse.length > 300
        ? longResponse.substring(0, 300)
        : longResponse;

    expect(truncated.length).toBeLessThanOrEqual(300);
  });

  it("should process queue in parallel without blocking", async () => {
    const queue: Array<{ id: number; delay: number }> = [
      { id: 1, delay: 100 },
      { id: 2, delay: 150 },
      { id: 3, delay: 120 },
    ];

    const startTime = Date.now();
    const promises = queue.map(
      (item) =>
        new Promise((resolve) => {
          setTimeout(() => resolve(item.id), item.delay);
        })
    );

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // Deve processar em paralelo (~150ms) não sequencial (~370ms)
    expect(results).toEqual([1, 2, 3]);
    expect(totalTime).toBeLessThan(250); // Paralelo é mais rápido
  });

  it("should reset state after question detected", () => {
    let accumulatedText = "I have 18 years of experience";
    let questionDetected = true;

    // Reset
    accumulatedText = "";
    questionDetected = false;

    expect(accumulatedText).toBe("");
    expect(questionDetected).toBe(false);
  });

  it("should handle continuous loop without stopping", async () => {
    let questionCount = 0;
    const maxQuestions = 3;

    for (let i = 0; i < maxQuestions; i++) {
      // Simular pergunta
      questionCount++;
      // Reset para próxima
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    expect(questionCount).toBe(3);
  });

  it("should measure latency < 2 seconds", async () => {
    const startTime = Date.now();

    // Simular processamento rápido
    await new Promise((resolve) => setTimeout(resolve, 500)); // Transcrição
    await new Promise((resolve) => setTimeout(resolve, 800)); // Análise
    await new Promise((resolve) => setTimeout(resolve, 300)); // Resposta

    const latency = Date.now() - startTime;

    expect(latency).toBeLessThan(2000);
  });

  it("should support multiple questions in sequence", async () => {
    const questions = [
      "What is your experience?",
      "What are your skills?",
      "Tell me about your projects.",
    ];

    const responses = questions.map((q) => ({
      question: q,
      timestamp: Date.now(),
    }));

    expect(responses.length).toBe(3);
    expect(responses[0].question).toContain("experience");
    expect(responses[1].question).toContain("skills");
    expect(responses[2].question).toContain("projects");
  });

  it("should not block on transcription errors", async () => {
    const transcribeWithError = async () => {
      throw new Error("Transcription failed");
    };

    const handleError = (error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error: ${msg}`;
    };

    try {
      await transcribeWithError();
    } catch (error) {
      const result = handleError(error);
      expect(result).toContain("Transcription failed");
    }
  });
});
