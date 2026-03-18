import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function streamAnswer(question: string, onToken: (t: string)=>void){
  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    stream: true,
    messages: [{ role: "user", content: `You are a senior data analyst in a live interview. Answer in simple English, max 2 short sentences, human tone, focus on impact. Question: ${question}` }]
  });

  for await (const chunk of stream){
    const token = chunk.choices[0]?.delta?.content;
    if(token) onToken(token);
  }
}
