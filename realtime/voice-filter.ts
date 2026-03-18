// Simple heuristic to reduce self-voice triggers
export function isLikelyInterviewer(text: string){
  if(!text) return false;
  const t = text.toLowerCase();
  // questions / interviewer cues
  return (
    t.includes("?") ||
    t.startsWith("how") ||
    t.startsWith("why") ||
    t.startsWith("what") ||
    t.startsWith("tell me") ||
    t.startsWith("can you")
  );
}
