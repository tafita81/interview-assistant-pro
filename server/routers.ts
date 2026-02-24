import { COOKIE_NAME } from "@shared/const";
import { RESUME_CONTEXT_FOR_LLM } from "@shared/resumeData";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import type { Message } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // STEP 1: Just transcribe and show everything
  transcribeAudioOnly: publicProcedure
    .input(z.object({
      audioBase64: z.string(),
      mimeType: z.string().default("audio/webm"),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.audioBase64, "base64");
      const ext = input.mimeType.includes("webm") ? "webm" : input.mimeType.includes("mp4") ? "m4a" : "mp3";
      const key = `a/${Date.now().toString(36)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      const transcription = await transcribeAudio({
        audioUrl: url,
        language: "en",
        prompt: "Interview transcription",
      });
      if ("error" in transcription) {
        throw new TRPCError({ code: "BAD_REQUEST", message: transcription.error });
      }
      const text = transcription.text?.trim() || "";
      return { transcription: text };
    }),

  // STEP 2: Analyze transcription, identify speaker, generate answer only if interviewer
  analyzeAndRespond: publicProcedure
    .input(z.object({
      transcription: z.string(),
      previousContext: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (input.transcription.length < 3) {
        return { isQuestion: false, translation: "", answer: "", summaryPtBr: "" };
      }

      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You analyze interview transcriptions. Determine if it's a question/prompt or a statement.

DETERMINATION:
- "question": Questions, prompts, follow-ups (Tell me about..., What is..., How did you..., Can you explain..., Describe...)
- "statement": Answers, explanations, self-descriptions (I worked on..., My experience..., I built..., I achieved...)

IF it's a question: provide answer + translation + summary
IF it's a statement: return isQuestion=false, leave other fields empty

Return ONLY valid JSON:
{"isQuestion":true|false,"answer":"<English answer 2-3 sentences MAX, natural, human, first person, NO question repetition>","translation":"<PT-BR translation of question>","summary":"<1 PT-BR phrase max 12 words>"}

ANSWER RULES (only if isQuestion=true):
- English, BRIEF 2-3 sentences MAX, 100% human natural
- First person ONLY (I, my, we)
- NO repeating question, NO filler, NO generic phrases
- Direct answer with specific metrics from resume
- Just what Rafael should speak, nothing else

${RESUME_CONTEXT_FOR_LLM}`
          },
          ...(input.previousContext ? [{ role: "user" as const, content: `Context: ${input.previousContext}` }] : []),
          { role: "user", content: input.transcription },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "interview_response",
            strict: true,
            schema: {
              type: "object",
              properties: {
                isQuestion: { type: "boolean", description: "true if question, false if statement" },
                answer: { type: "string", description: "English answer or empty" },
                translation: { type: "string", description: "PT-BR translation or empty" },
                summary: { type: "string", description: "PT-BR summary or empty" },
              },
              required: ["isQuestion", "answer", "translation", "summary"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = result.choices[0]?.message?.content;
      const raw = typeof content === "string" ? content : "{}";
      try {
        const parsed = JSON.parse(raw);
        const isQuestion = parsed.isQuestion === true;
        if (!isQuestion) {
          return { isQuestion: false, translation: "", answer: "", summaryPtBr: "" };
        }
        return {
          isQuestion: true,
          translation: parsed.translation || "",
          answer: parsed.answer || "",
          summaryPtBr: parsed.summary || "",
        };
      } catch {
        return { isQuestion: false, translation: "", answer: raw, summaryPtBr: "" };
      }
    }),

  // LEGACY: Ultra-fast combined (kept for backward compatibility)
  processAudioFast: publicProcedure
    .input(z.object({
      audioBase64: z.string(),
      mimeType: z.string().default("audio/webm"),
      previousContext: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.audioBase64, "base64");
      const ext = input.mimeType.includes("webm") ? "webm" : input.mimeType.includes("mp4") ? "m4a" : "mp3";
      const key = `a/${Date.now().toString(36)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      const transcription = await transcribeAudio({
        audioUrl: url,
        language: "en",
        prompt: "Interview transcription",
      });
      if ("error" in transcription) {
        throw new TRPCError({ code: "BAD_REQUEST", message: transcription.error });
      }
      const text = transcription.text?.trim() || "";
      if (text.length < 3) {
        return { transcription: "", translation: "", answer: "", summaryPtBr: "", speaker: "silence" as const };
      }

      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You analyze interview transcriptions. Determine if it's a question/prompt or a statement.

DETERMINATION:
- "question": Questions, prompts, follow-ups (Tell me about..., What is..., How did you..., Can you explain..., Describe...)
- "statement": Answers, explanations, self-descriptions (I worked on..., My experience..., I built..., I achieved...)

IF it's a question: provide answer + translation + summary
IF it's a statement: return isQuestion=false, leave other fields empty

Return ONLY valid JSON:
{"isQuestion":true|false,"answer":"<English answer 2-3 sentences MAX, natural, human, first person, NO question repetition>","translation":"<PT-BR translation of question>","summary":"<1 PT-BR phrase max 12 words>"}

ANSWER RULES (only if isQuestion=true):
- English, BRIEF 2-3 sentences MAX, 100% human natural
- First person ONLY (I, my, we)
- NO repeating question, NO filler, NO generic phrases
- Direct answer with specific metrics from resume
- Just what Rafael should speak, nothing else

${RESUME_CONTEXT_FOR_LLM}`
          },
          ...(input.previousContext ? [{ role: "user" as const, content: `Context: ${input.previousContext}` }] : []),
          { role: "user", content: text },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "interview_response",
            strict: true,
            schema: {
              type: "object",
              properties: {
                isQuestion: { type: "boolean", description: "true if question, false if statement" },
                answer: { type: "string", description: "English answer or empty" },
                translation: { type: "string", description: "PT-BR translation or empty" },
                summary: { type: "string", description: "PT-BR summary or empty" },
              },
              required: ["isQuestion", "answer", "translation", "summary"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = result.choices[0]?.message?.content;
      const raw = typeof content === "string" ? content : "";
      try {
        const parsed = JSON.parse(raw);
        const speaker = parsed.speaker || "silence";
        if (speaker === "candidate" || speaker === "silence") {
          return { transcription: text, translation: "", answer: "", summaryPtBr: "", speaker };
        }
        return {
          transcription: text,
          translation: parsed.translation || "",
          answer: parsed.answer || "",
          summaryPtBr: parsed.summary || "",
          speaker: "interviewer" as const,
        };
      } catch {
        return { transcription: text, translation: "", answer: raw, summaryPtBr: "", speaker: "interviewer" as const };
      }
    }),

  // FAST: Generate answer from text (1 LLM call)
  generateAnswerFast: publicProcedure
    .input(z.object({
      question: z.string(),
      context: z.string().optional(),
      mode: z.enum(["interview", "technical"]).default("interview"),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = input.mode === "interview"
        ? `Interview coach for Rafael Rodrigues. Return ONLY JSON:
{"answer":"<2-3 sentence English answer, natural, human, first person, NO question repetition>","summary":"<1 PT-BR phrase max 12 words>"}
RULES: English, BRIEF 2-3 MAX, 100% human, first person ONLY, resume metrics. NO filler, NO question repetition.
${RESUME_CONTEXT_FOR_LLM}`
        : `Technical expert. Return ONLY JSON:
{"answer":"<direct answer/code only>","summary":"<1 PT-BR phrase max 12 words>"}
RULES: ONLY direct answer/code. NO explanations. SQL=exact query. Python=exact code. Multiple choice=correct option letter only. 100% accurate, ultra-fast.
${RESUME_CONTEXT_FOR_LLM}`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          ...(input.context ? [{ role: "user" as const, content: `Context: ${input.context}` }] : []),
          { role: "user", content: input.question },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "answer_response",
            strict: true,
            schema: {
              type: "object",
              properties: {
                answer: { type: "string", description: "The answer" },
                summary: { type: "string", description: "PT-BR summary" },
              },
              required: ["answer", "summary"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = result.choices[0]?.message?.content;
      const raw = typeof content === "string" ? content : "{}";
      try {
        const parsed = JSON.parse(raw);
        return { answer: parsed.answer || "", summaryPtBr: parsed.summary || "" };
      } catch {
        return { answer: raw, summaryPtBr: "" };
      }
    }),

  // FAST: Process image (1 LLM call)
  processImageFast: publicProcedure
    .input(z.object({
      imageBase64: z.string(),
      context: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const messages: Message[] = [
        {
          role: "system",
          content: `Technical expert. Return ONLY JSON:
{"answer":"<direct answer/code only>","summary":"<1 PT-BR phrase max 12 words>"}
RULES: ONLY direct answer/code. NO explanations. SQL=exact query. Python=exact code. Multiple choice=correct option letter only. 100% accurate.
${RESUME_CONTEXT_FOR_LLM}`
        },
        ...(input.context ? [{ role: "user" as const, content: `Context: ${input.context}` }] : []),
        {
          role: "user" as const,
          content: [
            { type: "text" as const, text: "Direct answer only." },
            { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${input.imageBase64}`, detail: "high" as const } },
          ],
        },
      ];

      const result = await invokeLLM({ messages });

      const content = result.choices[0]?.message?.content;
      const raw = typeof content === "string" ? content : "{}";
      try {
        const parsed = JSON.parse(raw);
        return { answer: parsed.answer || "", summaryPtBr: parsed.summary || "" };
      } catch {
        return { answer: raw, summaryPtBr: "" };
      }
    }),
});

export type AppRouter = typeof appRouter;
