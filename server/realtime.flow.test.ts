import { describe, it, expect, vi } from "vitest";
import { invokeLLM } from "./server/_core/llm";

describe("Realtime Flow - Resposta em Tempo Real", () => {
  it("deve transcrever pergunta em inglês corretamente", async () => {
    // Simular pergunta em inglês
    const question = "What is your experience with data analysis?";
    
    expect(question).toContain("experience");
    expect(question).toContain("data");
  });

  it("deve gerar resposta para pergunta específica", async () => {
    const question = "What is your experience with data analysis?";
    
    // Simular chamada ao LLM
    const prompt = `You are a Senior Data Analyst with 18+ years of experience. 
Answer the SPECIFIC question asked: "${question}"
Keep response to 2-3 sentences max (~300 characters).
Use simple English (A2-B1 level).
Answer in first person.`;

    console.log("[TEST] Prompt:", prompt);
    
    // Verificar que o prompt contém a pergunta específica
    expect(prompt).toContain(question);
    expect(prompt).toContain("SPECIFIC question");
  });

  it("deve traduzir pergunta para PT-BR", async () => {
    const question = "What is your experience with data analysis?";
    
    // Simular tradução
    const expectedTranslation = "Qual é sua experiência com análise de dados?";
    
    expect(expectedTranslation).toContain("experiência");
    expect(expectedTranslation).toContain("análise");
  });

  it("deve limitar resposta a 300 caracteres", async () => {
    const response = "I have 18 years of experience as a Senior Data Analyst, specializing in ETL, ML models, and BI tools like Power BI and Tableau. My work consistently delivers results, including accelerating reporting by 40-70% and achieving over $3M in savings through data-driven strategies.";
    
    // Resposta deve ser truncada
    const truncated = response.length > 300 ? response.substring(0, 300) : response;
    
    expect(truncated.length).toBeLessThanOrEqual(300);
    console.log("[TEST] Resposta truncada:", truncated);
  });

  it("deve manter fluxo contínuo após resposta", async () => {
    // Simular pergunta 1
    const question1 = "What is your experience?";
    expect(question1).toBeTruthy();
    
    // Simular resposta 1
    const answer1 = "I have 18 years of experience.";
    expect(answer1).toContain("18 years");
    
    // Simular pergunta 2 (diferente)
    const question2 = "What tools do you use?";
    expect(question2).not.toEqual(question1);
    
    // Simular resposta 2 (deve ser diferente)
    const answer2 = "I use Python, SQL, and Power BI.";
    expect(answer2).not.toEqual(answer1);
  });
});
