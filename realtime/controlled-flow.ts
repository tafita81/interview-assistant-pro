// Control when to answer: wait for full question, lock answer until next question

let currentQuestion = "";
let isLocked = false;

export function shouldProcess(text: string){
  if(isLocked) return false;

  const t = text.toLowerCase();

  // detect likely full question
  const isComplete = (
    t.endsWith("?") ||
    t.split(" ").length > 8
  );

  return isComplete;
}

export function lockAnswer(q: string){
  currentQuestion = q;
  isLocked = true;
}

export function unlockIfNewQuestion(newText: string){
  if(newText && newText !== currentQuestion && newText.length > 10){
    isLocked = false;
  }
}

export function isAnswerLocked(){
  return isLocked;
}
