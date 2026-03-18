// FINAL UNIFIED ENGINE

import { pushChunk } from "../realtime/question-boundary";
import { updatePrediction } from "../realtime/predictive-engine";
import { buildFinalAnswer } from "../realtime/psychological-engine";
import { optimizeForHiring } from "../realtime/hiring-optimizer";

export function startEngine(onAnswer: (a:string)=>void){

  return function onAudioChunk(chunk: string){

    // 1. Predict while listening
    updatePrediction(chunk);

    // 2. Wait for full question
    pushChunk(chunk, async (fullQuestion)=>{

      // 3. Generate answer (placeholder)
      let answer = `I use data to solve problems and deliver results.`;

      // 4. Psychological layer
      answer = buildFinalAnswer(answer);

      // 5. Hiring optimization
      answer = optimizeForHiring(answer);

      // 6. Output (locked)
      onAnswer(answer);
    });
  };
}
