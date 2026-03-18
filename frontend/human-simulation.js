// Ultra human simulation: micro-pauses + reading rhythm (no auto font override)

let timer = null;

export function simulateHumanReading(text){
  const el = document.getElementById('answer');
  if(!el) return;

  el.innerText = "";

  const words = text.split(" ");
  let i = 0;

  function next(){
    if(i >= words.length) return;

    el.innerText += (i === 0 ? "" : " ") + words[i];

    // micro delay variations (human-like)
    let delay = 40 + Math.random() * 60;

    // pause on punctuation
    if(words[i].includes(".") || words[i].includes(",")){
      delay += 120;
    }

    i++;
    timer = setTimeout(next, delay);
  }

  next();
}

export function stopSimulation(){
  if(timer) clearTimeout(timer);
}
