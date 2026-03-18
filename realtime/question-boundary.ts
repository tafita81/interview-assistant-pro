// Robust question boundary detection: wait for near-complete question

let buffer = "";
let lastEmit = "";
let silenceTimer: any = null;

// Heuristics:
// 1) End with question mark OR
// 2) Long enough + pause (silence) OR
// 3) Common question starters + sufficient length

function looksLikeQuestion(text: string){
  const t = text.toLowerCase().trim();
  return (
    t.endsWith("?") ||
    t.startsWith("how") ||
    t.startsWith("why") ||
    t.startsWith("what") ||
    t.startsWith("tell me") ||
    t.startsWith("can you") ||
    t.startsWith("walk me")
  );
}

export function pushChunk(chunk: string, onReady: (q: string)=>void){
  if(!chunk) return;
  buffer += (buffer ? " " : "") + chunk.trim();

  // reset silence timer on every chunk
  if(silenceTimer) clearTimeout(silenceTimer);

  // if explicit question mark and decent length, emit immediately
  if(buffer.endsWith("?") && buffer.split(" ").length >= 6){
    emit(onReady);
    return;
  }

  // otherwise wait a short silence to consider it complete
  silenceTimer = setTimeout(()=>{
    const words = buffer.split(" ").length;
    if(words >= 8 && looksLikeQuestion(buffer)){
      emit(onReady);
    }
  }, 350); // small wait for completion (not a visual delay)
}

function emit(onReady: (q: string)=>void){
  const q = buffer.trim();
  if(!q) return;
  if(q === lastEmit) return; // avoid duplicates

  lastEmit = q;
  buffer = "";
  if(silenceTimer) clearTimeout(silenceTimer);

  onReady(q);
}

// When a new stream starts or force reset
export function resetBoundary(){
  buffer = "";
  lastEmit = "";
  if(silenceTimer) clearTimeout(silenceTimer);
}
