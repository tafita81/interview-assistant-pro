// Audio control: disabled by default + manual toggle button

let audioEnabled = false;

export function toggleAudio(){
  audioEnabled = !audioEnabled;

  const btn = document.getElementById('audioToggle');
  if(btn){
    btn.innerText = audioEnabled ? '🔊 Audio ON' : '🔇 Audio OFF';
  }
}

export function canPlayAudio(){
  return audioEnabled;
}

export function playIfEnabled(fn){
  if(audioEnabled && typeof fn === 'function'){
    fn();
  }
}
