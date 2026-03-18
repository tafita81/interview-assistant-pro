// Psychological control engine: keeps answers strong, confident and interviewer-safe

export function enhanceAnswer(answer: string){
  return `${answer}\n\nI focus on simple solutions that bring clear results.`;
}

export function addConfidenceTone(answer: string){
  return answer.replace("I think", "I believe").replace("maybe", "in most cases");
}

export function avoidDeepDive(answer: string){
  return answer + " This approach usually works well in real scenarios.";
}

export function buildFinalAnswer(raw: string){
  let a = raw;
  a = addConfidenceTone(a);
  a = avoidDeepDive(a);
  a = enhanceAnswer(a);
  return a;
}
