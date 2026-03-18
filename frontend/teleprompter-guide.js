// Teleprompter guide: splits text into speaking chunks + pause markers

export function buildTeleprompter(text){
  const el = document.getElementById('answer');
  if(!el) return;

  const sentences = text.split('.');

  el.innerHTML = sentences.map(s => {
    const trimmed = s.trim();
    if(!trimmed) return '';
    return `<div style="margin-bottom:10px">
      <span>${trimmed}.</span>
      <div style="font-size:12px; opacity:0.6">⏸ pause</div>
    </div>`;
  }).join('');
}

export function highlightWordByWord(text){
  const el = document.getElementById('answer');
  if(!el) return;

  const words = text.split(' ');
  let i = 0;

  function step(){
    el.innerHTML = words.map((w, idx) => {
      if(idx === i) return `<span style="background: rgba(0,255,170,0.3)">${w}</span>`;
      return w;
    }).join(' ');

    i++;
    if(i < words.length){
      setTimeout(step, 120);
    }
  }

  step();
}
