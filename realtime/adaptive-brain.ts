// Adaptive brain: adjusts answer style based on question type

export function classifyType(q: string){
  const t = q.toLowerCase();
  if(t.includes("tell me about") || t.includes("experience")) return "behavioral";
  if(t.includes("how") || t.includes("design") || t.includes("architecture")) return "technical";
  return "general";
}

export function buildPrompt(question: string){
  const type = classifyType(question);

  let style = "";

  if(type === "behavioral"){
    style = "Answer naturally, briefly, with impact.";
  } else if(type === "technical"){
    style = "Start conceptual, add light technical detail, keep it short.";
  } else {
    style = "Answer simply and clearly.";
  }

  return `You are a senior data analyst in a live interview. ${style} Max 2 sentences. Human tone. Question: ${question}`;
}
