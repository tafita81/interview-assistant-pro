// Ultra natural reading: smooth reveal + focus line (no auto font changes)

let rafId = null;
let lastText = "";

export function renderAnswerSmooth(text){
  const el = document.getElementById('answer');
  if(!el) return;

  cancelAnimationFrame(rafId);
  let i = 0;
  const speed = 12; // chars per frame (~natural pace)

  function step(){
    i += speed;
    const slice = text.slice(0, i);
    el.innerText = slice;

    // caret style cursor for natural reading
    el.style.borderRight = '2px solid rgba(0,255,170,0.6)';

    if(i < text.length){
      rafId = requestAnimationFrame(step);
    } else {
      el.style.borderRight = 'none';
    }
  }

  lastText = text;
  rafId = requestAnimationFrame(step);
}

// optional: highlight current line (simple heuristic)
export function highlightFocus(){
  const el = document.getElementById('answer');
  if(!el) return;

  const lines = el.innerText.split('\n');
  if(lines.length <= 1) return;

  const lastLine = lines[lines.length - 1];
  el.innerHTML = lines.slice(0, -1).join('<br/>') + '<br/><span style="background: rgba(0,255,170,0.15)">' + lastLine + '</span>';
}

// keep question subtle
export function styleQuestion(){
  const q = document.getElementById('question');
  if(!q) return;
  q.style.opacity = '0.7';
}
