import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateRealtimeAnswer(question: string) {
  const prompt = `
You are a senior data analyst in a live interview.

Rules:
- Answer in simple English
- Max 2 short sentences
- Sound human and natural
- Focus on business impact and clarity

Question:
${question}

Answer:
`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5
  });

  return res.choices[0].message.content;
}
