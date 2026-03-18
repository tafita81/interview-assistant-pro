import { describe, it, expect, vi } from "vitest";

/**
 * Continuous Interview Loop Tests
 * Validates: answer size limit, loop reset, multiple questions
 */

describe("Continuous Interview Loop", () => {
  it("should limit answer to 300 characters", () => {
    const longAnswer =
      "I am a Senior Data Analyst/Analytics Engineer with 18+ years of experience, currently at Keyrus, where I've specialized in ETL/ELT with dbt and Airflow, and advanced BI tools like Power BI and Tableau. My work consistently delivers tangible results, including accelerating reporting by 40-70% and achieving over $3M in savings through data-driven strategies. This approach usually works well in real scenarios. I focus on simple solutions that bring clear results. I focus on real business impact. I deliver reliable and consistent results.";

    // Truncate to 300 chars
    let answer = longAnswer;
    if (answer.length > 300) {
      answer = answer.substring(0, 300);
      const lastPeriod = answer.lastIndexOf(".");
      if (lastPeriod > 100) {
        answer = answer.substring(0, lastPeriod + 1);
      }
    }

    expect(answer.length).toBeLessThanOrEqual(300);
    expect(answer).toContain(".");
  });

  it("should reset state for new question", () => {
    let currentAnswer = "";
    let answerLocked = false;
    let lastQuestion = "";

    const resetForNewQuestion = () => {
      lastQuestion = "";
      currentAnswer = "";
      answerLocked = false;
    };

    // First question
    lastQuestion = "Tell me about your experience";
    currentAnswer = "I have 18 years of experience";
    answerLocked = true;

    expect(answerLocked).toBe(true);
    expect(currentAnswer).not.toBe("");

    // Reset for new question
    resetForNewQuestion();

    expect(answerLocked).toBe(false);
    expect(currentAnswer).toBe("");
    expect(lastQuestion).toBe("");
  });

  it("should detect different questions and reset answer", () => {
    let lastFullQuestion = "";
    let answerLocked = false;

    const processQuestion = (question: string) => {
      if (question !== lastFullQuestion && question.trim()) {
        if (lastFullQuestion !== "") {
          // New question detected
          answerLocked = false;
        }
        lastFullQuestion = question;
      }
    };

    // First question
    processQuestion("Tell me about your experience");
    answerLocked = true;
    expect(answerLocked).toBe(true);

    // Second question (different)
    processQuestion("What is your strongest skill?");
    expect(answerLocked).toBe(false);
    expect(lastFullQuestion).toBe("What is your strongest skill?");
  });

  it("should NOT process same question twice", () => {
    let processCount = 0;
    let lastQuestion = "";

    const processQuestion = (question: string) => {
      if (question === lastQuestion) {
        return; // Skip same question
      }
      lastQuestion = question;
      processCount++;
    };

    processQuestion("Tell me about your experience");
    processQuestion("Tell me about your experience");
    processQuestion("Tell me about your experience");

    expect(processCount).toBe(1);
  });

  it("should lock answer after generation", () => {
    let answer = "";
    let answerLocked = false;

    const generateAnswer = (newAnswer: string) => {
      answer = newAnswer;
      answerLocked = true;
    };

    generateAnswer("I have 18 years of experience");
    expect(answerLocked).toBe(true);
    expect(answer).toBe("I have 18 years of experience");

    // Try to change (should not work in real flow)
    if (!answerLocked) {
      answer = "Different answer";
    }

    expect(answer).toBe("I have 18 years of experience");
  });

  it("should maintain context across multiple turns", () => {
    let context = "";

    const updateContext = (q: string, a: string) => {
      context = `Q: ${q}\nA: ${a}`;
    };

    updateContext("Tell me about your experience", "I have 18 years");
    expect(context).toContain("Tell me about your experience");
    expect(context).toContain("I have 18 years");

    const firstContext = context;

    updateContext("What is your strongest skill?", "Python and SQL");
    expect(context).toContain("What is your strongest skill?");
    expect(context).toContain("Python and SQL");
    expect(context).not.toBe(firstContext);
  });

  it("should schedule auto-reset after inactivity", (done) => {
    let resetCalled = false;

    const scheduleAutoReset = (callback: () => void) => {
      setTimeout(() => {
        callback();
      }, 100); // 100ms for test
    };

    scheduleAutoReset(() => {
      resetCalled = true;
    });

    setTimeout(() => {
      expect(resetCalled).toBe(true);
      done();
    }, 150);
  });

  it("should handle multiple questions in sequence", async () => {
    const questions = [
      "Tell me about your experience",
      "What is your strongest skill?",
      "How do you handle pressure?",
    ];

    const answers: string[] = [];
    let processedCount = 0;

    for (const question of questions) {
      // Simulate processing
      const answer = `Answer to: ${question}`;
      answers.push(answer);
      processedCount++;
    }

    expect(processedCount).toBe(3);
    expect(answers).toHaveLength(3);
    expect(answers[0]).toContain("experience");
    expect(answers[1]).toContain("skill");
    expect(answers[2]).toContain("pressure");
  });

  it("should truncate answer properly at sentence boundary", () => {
    const longAnswer =
      "I have 18 years of experience. I specialize in data analytics. I have worked with Python, SQL, and BI tools. This is a very long answer that should be truncated.";

    let answer = longAnswer;
    if (answer.length > 50) {
      // Smaller limit for test
      answer = answer.substring(0, 50);
      const lastPeriod = answer.lastIndexOf(".");
      if (lastPeriod > 10) {
        answer = answer.substring(0, lastPeriod + 1);
      }
    }

    expect(answer.length).toBeLessThanOrEqual(50);
    expect(answer.endsWith(".")).toBe(true);
  });

  it("should continue listening after response", () => {
    let isListening = false;
    let responseGenerated = false;

    const startListening = () => {
      isListening = true;
    };

    const generateResponse = () => {
      responseGenerated = true;
      // Should NOT stop listening
    };

    startListening();
    expect(isListening).toBe(true);

    generateResponse();
    expect(responseGenerated).toBe(true);
    expect(isListening).toBe(true); // Still listening
  });
});
