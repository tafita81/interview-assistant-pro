// UI controls for font size and colors (questions vs answers)

let answerSize = 20;
let questionSize = 16;

export function setAnswerFont(size){
  answerSize = size;
  applyStyles();
}

export function setQuestionFont(size){
  questionSize = size;
  applyStyles();
}

export function applyStyles(){
  const answer = document.getElementById("answer");
  const question = document.getElementById("question");

  if(answer){
    answer.style.fontSize = answerSize + "px";
    answer.style.color = "#00FFAA"; // verde claro
    answer.style.lineHeight = "1.4";
  }

  if(question){
    question.style.fontSize = questionSize + "px";
    question.style.color = "#FFFFFF"; // branco
    question.style.opacity = "0.8";
  }
}
