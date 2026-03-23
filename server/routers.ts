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

  // STEP 2: Translate + Generate answer for ANY transcription (NO speaker filtering)
  analyzeAndRespond: publicProcedure
    .input(z.object({
      transcription: z.string(),
      previousContext: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (input.transcription.length < 3) {
        return { translation: "", answer: "" };
      }

      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an interview coach for Rafael Rodrigues, a Senior Data Analyst with 18+ years experience. CRITICAL: Answer the SPECIFIC question asked with STRATEGIC thinking.

1. Translate question to PT-BR
2. Generate SENIOR ANALYST answer (strategic, high-level, value-focused)
3. Add PT-BR phonetic pronunciation for difficult English words

Return ONLY valid JSON:
{"translation":"<PT-BR translation>","answer":"<Strategic answer with phonetics>"}

RULES:
- English, BRIEF 2-3 sentences MAX (~300 chars)
- Simple vocabulary (A2-B1 level)
- First person (I, my, we)
- DIRECTLY answer the question
- NO generic intro, NO repeating question
- AVOID technical details - focus on IMPACT, VALUE, RESULTS
- Think like a SENIOR ANALYST: strategic vision, business impact, ROI
- Soft skills: leadership, decision-making, stakeholder management
- What matters: outcomes, efficiency gains, cost savings, team impact
- Use resume details ONLY if relevant to value proposition
- Must fit 3-4 lines
- PHONETICS: Add PT-BR pronunciation in parentheses for key words
  * Example: "Five (Faive)" 
  * Example: "System (Sistêm)"
  * Example: "Analysis (Análisis)"
  * Include phonetics for: numbers, technical terms, difficult pronunciations

REFERENCE:
${RESUME_CONTEXT_FOR_LLM}`
          },
          ...(input.previousContext ? [{ role: "user" as const, content: `Previous: ${input.previousContext}` }] : []),
          { role: "user", content: `QUESTION: ${input.transcription}\nAnswer this directly.` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "interview_response",
            strict: true,
            schema: {
              type: "object",
              properties: {
                translation: { type: "string", description: "PT-BR translation" },
                answer: { type: "string", description: "English answer" },
              },
              required: ["translation", "answer"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = result.choices[0]?.message?.content;
      const raw = typeof content === "string" ? content : "{}";
      try {
        const parsed = JSON.parse(raw);
        // ENFORCE: Answer must be <= 300 characters
        let answer = (parsed.answer || "").trim();
        if (answer.length > 300) {
          // Truncate to last complete sentence within 300 chars
          answer = answer.substring(0, 300);
          const lastPeriod = answer.lastIndexOf(".");
          if (lastPeriod > 100) {
            answer = answer.substring(0, lastPeriod + 1);
          }
        }
        return {
          translation: parsed.translation || "",
          answer: answer,
        };
      } catch {
        return { translation: "", answer: raw };
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
        return { transcription: "", translation: "", answer: "" };
      }

      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an interview coach for Rafael Rodrigues, a Senior Data Analyst with 18+ years experience. CRITICAL: Answer the SPECIFIC question asked with STRATEGIC thinking.

1. Translate question to PT-BR
2. Generate SENIOR ANALYST answer (strategic, high-level, value-focused)
3. Add PT-BR phonetic pronunciation for difficult English words

Return ONLY valid JSON:
{"translation":"<PT-BR translation>","answer":"<Strategic answer with phonetics>"}

RULES:
- English, BRIEF 2-3 sentences MAX (~300 chars)
- Simple vocabulary (A2-B1 level)
- First person (I, my, we)
- DIRECTLY answer the question
- NO generic intro, NO repeating question
- AVOID technical details - focus on IMPACT, VALUE, RESULTS
- Think like a SENIOR ANALYST: strategic vision, business impact, ROI
- Soft skills: leadership, decision-making, stakeholder management
- What matters: outcomes, efficiency gains, cost savings, team impact
- Use resume details ONLY if relevant to value proposition
- Must fit 3-4 lines
- PHONETICS: Add PT-BR pronunciation in parentheses for key words
  * Example: "Five (Faive)" 
  * Example: "System (Sistêm)"
  * Example: "Analysis (Análisis)"
  * Include phonetics for: numbers, technical terms, difficult pronunciations

REFERENCE:
${RESUME_CONTEXT_FOR_LLM}`
          },
          ...(input.previousContext ? [{ role: "user" as const, content: `Previous: ${input.previousContext}` }] : []),
          { role: "user", content: `QUESTION: ${text}\nAnswer this directly.` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "interview_response",
            strict: true,
            schema: {
              type: "object",
              properties: {
                translation: { type: "string", description: "PT-BR translation" },
                answer: { type: "string", description: "English answer" },
              },
              required: ["translation", "answer"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = result.choices[0]?.message?.content;
      const raw = typeof content === "string" ? content : "";
      try {
        const parsed = JSON.parse(raw);
        let answer = (parsed.answer || "").trim();
        if (answer.length > 300) {
          answer = answer.substring(0, 300);
          const lastPeriod = answer.lastIndexOf(".");
          if (lastPeriod > 100) {
            answer = answer.substring(0, lastPeriod + 1);
          }
        }
        return {
          transcription: text,
          translation: parsed.translation || "",
          answer: answer || "",
        };
      } catch {
        return { transcription: text, translation: "", answer: raw };
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
{"answer":"<2-3 sentence English answer, natural, human, first person, NO question repetition>"}
RULES: English, BRIEF 2-3 MAX, 100% human, first person ONLY, resume metrics. NO filler, NO question repetition.
${RESUME_CONTEXT_FOR_LLM}`
        : `Technical expert. Return ONLY JSON:
{"answer":"<direct answer/code only>"}
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
              },
              required: ["answer"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = result.choices[0]?.message?.content;
      const raw = typeof content === "string" ? content : "{}";
      try {
        const parsed = JSON.parse(raw);
        return { answer: parsed.answer || "" };
      } catch {
        return { answer: raw };
      }
    }),

  // FAST: Process image (1 LLM call)
  processImageFast: publicProcedure
    .input(z.object({
      imageBase64: z.string(),
      mimeType: z.string().default("image/jpeg"),
      context: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const messages: Message[] = [
        {
          role: "system",
          content: `Technical expert. Return ONLY JSON:
{"answer":"<direct answer/code only>"}
RULES: ONLY direct answer/code. NO explanations. SQL=exact query. Python=exact code. Multiple choice=correct option letter only. 100% accurate.
${RESUME_CONTEXT_FOR_LLM}`
        },
        ...(input.context ? [{ role: "user" as const, content: `Context: ${input.context}` }] : []),
        {
          role: "user" as const,
          content: [
            { type: "text" as const, text: "Direct answer only." },
            { type: "image_url" as const, image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}`, detail: "high" as const } },
          ],
        },
      ];

      const result = await invokeLLM({ messages });

      const content = result.choices[0]?.message?.content;
      const raw = typeof content === "string" ? content : "{}";
      try {
        const parsed = JSON.parse(raw);
        return { answer: parsed.answer || "" };
      } catch {
        return { answer: raw };
      }
    }),
});

export type AppRouter = typeof appRouter;
