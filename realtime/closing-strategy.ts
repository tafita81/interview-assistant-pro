// Closing strategy: generate strong final answers and smart questions

export function closingPitch(){
  return "I’m excited about this role. I can add value quickly and deliver reliable results.";
}

export function closingQuestion(){
  return "What are the main goals for this role in the first months?";
}

export function politeClose(){
  return "Thank you for your time. I enjoyed our conversation.";
}

export function buildClosing(){
  return `${closingPitch()}\n${closingQuestion()}\n${politeClose()}`;
}
