// Ensure answer always fully visible and pinned at top without auto font override

export function pinAnswerTop(){
  const answer = document.getElementById("answer");
  const question = document.getElementById("question");

  if(answer){
    answer.style.position = "fixed";
    answer.style.top = "0px";
    answer.style.left = "0px";
    answer.style.right = "0px";
    answer.style.padding = "10px";
    answer.style.zIndex = "9999";
    answer.style.background = "rgba(0,0,0,0.6)";
    answer.style.overflowWrap = "break-word";
    answer.style.maxHeight = "50vh";
    answer.style.overflowY = "auto";
  }

  if(question){
    question.style.position = "fixed";
    question.style.top = "52vh";
    question.style.left = "0px";
    question.style.right = "0px";
    question.style.padding = "10px";
    question.style.background = "rgba(0,0,0,0.4)";
  }
}
