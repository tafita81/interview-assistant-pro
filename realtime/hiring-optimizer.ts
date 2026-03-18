// Hiring optimizer: bias answers toward hire decision signals

export function optimizeForHiring(answer: string){
  let a = answer;

  // reinforce impact
  if(!a.toLowerCase().includes("impact")){
    a += " I focus on real business impact.";
  }

  // reinforce reliability
  if(!a.toLowerCase().includes("reliable")){
    a += " I deliver reliable and consistent results.";
  }

  // reinforce communication
  if(!a.toLowerCase().includes("simple")){
    a += " I keep things simple and easy to understand.";
  }

  return a;
}
