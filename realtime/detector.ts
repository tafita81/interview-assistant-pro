export function detectQuestion(text: string) {
  const t = text.toLowerCase();

  return (
    t.includes("?") ||
    t.startsWith("how") ||
    t.startsWith("why") ||
    t.startsWith("what") ||
    t.startsWith("tell me") ||
    t.length > 40
  );
}
