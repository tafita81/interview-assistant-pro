// Dynamic font size control for small screens (iPhone friendly)

let currentSize = 20;

export function increaseFont(){
  currentSize += 2;
  applyFont();
}

export function decreaseFont(){
  currentSize -= 2;
  if(currentSize < 14) currentSize = 14;
  applyFont();
}

export function applyFont(){
  const el = document.getElementById("answer");
  if(el){
    el.style.fontSize = currentSize + "px";
    el.style.lineHeight = "1.4";
  }
}
