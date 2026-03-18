// Predictive engine: anticipates intent but ONLY releases answer after boundary confirmation

let predictedIntent = "";
let previewAnswer = "";

export function predictIntent(partial: string){
  const t = partial.toLowerCase();

  if(t.includes("experience")) return "experience";
  if(t.includes("strength")) return "strength";
  if(t.includes("weakness")) return "weakness";
  if(t.includes("design") || t.includes("architecture")) return "technical";

  return "general";
}

export function prebuildAnswer(intent: string){
  switch(intent){
    case "experience":
      return "I have over 18 years of experience working with data tools and delivering real results.";

    case "strength":
      return "I am strong at solving problems with data and delivering clear business results.";

    case "weakness":
      return "I am improving my backend skills, and I am learning quickly in this area.";

    case "technical":
      return "I design simple and scalable solutions using cloud tools and clean data models.";

    default:
      return "I focus on simple solutions that bring clear and fast results.";
  }
}

export function updatePrediction(partial: string){
  predictedIntent = predictIntent(partial);
  previewAnswer = prebuildAnswer(predictedIntent);
}

export function getPreview(){
  return previewAnswer;
}

export function finalizeAnswer(fullQuestion: string, realAnswer: string){
  // Always trust full AI answer, prediction is just for speed
  return realAnswer;
}
