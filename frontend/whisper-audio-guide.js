// Invisible audio guide using Web Speech API (low volume, earbud-friendly)

let utterance = null;

export function speakSoft(text){
  if(!('speechSynthesis' in window)) return;

  stopSpeak();

  utterance = new SpeechSynthesisUtterance(text);

  utterance.lang = 'en-US';
  utterance.rate = 0.9; // slightly slower
  utterance.pitch = 1;
  utterance.volume = 0.2; // low volume ("invisible")

  speechSynthesis.speak(utterance);
}

export function stopSpeak(){
  if(speechSynthesis.speaking){
    speechSynthesis.cancel();
  }
}

// Sync speech with chunks (better control)
export function speakByChunks(text){
  const parts = text.split('.');

  function next(i){
    if(i >= parts.length) return;

    const sentence = parts[i].trim();
    if(!sentence) return next(i+1);

    const u = new SpeechSynthesisUtterance(sentence);
    u.lang = 'en-US';
    u.rate = 0.9;
    u.volume = 0.2;

    u.onend = () => setTimeout(()=>next(i+1), 150);

    speechSynthesis.speak(u);
  }

  next(0);
}
