// Connect final engine to UI

import { startEngine } from "../core/engine";
import { toPhoneticPTBR } from "./phonetic-ptbr";
import { showTranslatedQuestion } from "./realtime-ui-advanced";

export function initApp(){

  const engine = startEngine((answer)=>{

    // show answer (top)
    document.getElementById('answer').innerText = answer;

    // phonetic
    const phon = toPhoneticPTBR(answer);
    document.getElementById('phonetic').innerText = phon;

  });

  return engine;
}
