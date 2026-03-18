// Advanced UI: speech sync + translation + layout control

let speaking = false;

export function syncWithSpeech(text){
  const el = document.getElementById('answer');
  if(!el) return;

  const words = text.split(' ');
  let i = 0;

  function step(){
    if(i >= words.length) return;

    el.innerText = words.slice(0, i + 1).join(' ');

    let delay = 120;

    // slower on punctuation
    if(words[i].includes('.') || words[i].includes(',')){
      delay = 250;
    }

    i++;
    setTimeout(step, delay);
  }

  step();
}

// Keep answer always top and filling width
export function layoutTopFull(){
  const answer = document.getElementById('answer');
  const question = document.getElementById('question');

  if(answer){
    answer.style.position = 'fixed';
    answer.style.top = '0';
    answer.style.left = '0';
    answer.style.right = '0';
    answer.style.width = '100%';
    answer.style.padding = '12px';
    answer.style.display = 'block';
    answer.style.whiteSpace = 'normal';
    answer.style.wordBreak = 'break-word';
    answer.style.zIndex = '9999';
  }

  if(question){
    question.style.position = 'fixed';
    question.style.bottom = '0';
    question.style.left = '0';
    question.style.right = '0';
    question.style.padding = '10px';
    question.style.opacity = '0.8';
  }
}

// Translate interviewer text (simple placeholder hook)
export function showTranslatedQuestion(original, translated){
  const q = document.getElementById('question');
  if(!q) return;

  q.innerHTML = `
    <div style="font-size:14px; opacity:0.6">${original}</div>
    <div style="font-size:16px; color:#00FFAA">${translated}</div>
  `;
}
