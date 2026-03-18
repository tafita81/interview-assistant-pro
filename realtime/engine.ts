import { streamAnswer } from "../api/stream";

let buffer = "";

export function handleTranscript(chunk: string, send: any) {
  buffer += " " + chunk;

  if (buffer.length > 30) {
    streamAnswer(buffer, (token) => {
      send(token);
    });

    buffer = "";
  }
}
