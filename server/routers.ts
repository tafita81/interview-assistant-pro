import { COOKIE_NAME } from "@shared/const";
import { RESUME_CONTEXT_FOR_LLM } from "@shared/resumeData";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
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

  uploadAudio: publicProcedure
    .input(z.object({
      audioBase64: z.string(),
      mimeType: z.string().default("audio/webm"),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.audioBase64, "base64");
      const ext = input.mimeType.includes("webm") ? "webm" : input.mimeType.includes("mp4") ? "m4a" : "mp3";
      const key = `audio/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),

  processAudio: publicProcedure
    .input(z.object({
      audioUrl: z.string(),
      previousContext: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const transcription = await transcribeAudio({
        audioUrl: input.audioUrl,
        language: "en",
        prompt: "Transcribe this interview question accurately",
      });
      if ("error" in transcription) {
        throw new TRPCError({ code: "BAD_REQUEST", message: transcription.error });
      }
      const questionText = transcription.text;

      const [translationResult, answerResult] = await Promise.all([
        invokeLLM({
          messages: [
            { role: "system", content: "Translate to Brazilian Portuguese. Return ONLY the translation." },
            { role: "user", content: questionText },
          ],
        }),
        invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an interview coach for Rafael Rodrigues. Generate the PERFECT answer.

RULES:
- English, BRIEF (2-4 sentences max), 100% human and natural
- First person, specific metrics from resume when relevant
- NO filler, NO generic phrases, NO explanations of why
- Just the answer he should speak

${RESUME_CONTEXT_FOR_LLM}`
            },
            ...(input.previousContext ? [{ role: "user" as const, content: `Previous context: ${input.previousContext}` }] : []),
            { role: "user", content: questionText },
          ],
        }),
      ]);

      const translation = typeof translationResult.choices[0]?.message?.content === "string"
        ? translationResult.choices[0].message.content : "";
      const answer = typeof answerResult.choices[0]?.message?.content === "string"
        ? answerResult.choices[0].message.content : "";

      const summaryResult = await invokeLLM({
        messages: [
          { role: "system", content: "Resuma em UMA ÚNICA FRASE CURTA em português brasileiro o que esta resposta está explicando. Máximo 15 palavras. Sem aspas." },
          { role: "user", content: answer },
        ],
      });
      const summaryPtBr = typeof summaryResult.choices[0]?.message?.content === "string"
        ? summaryResult.choices[0].message.content : "";

      return { transcription: questionText, translation, answer, summaryPtBr };
    }),

  generateAnswer: publicProcedure
    .input(z.object({
      question: z.string(),
      context: z.string().optional(),
      mode: z.enum(["interview", "technical"]).default("interview"),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = input.mode === "interview"
        ? `You are an interview coach for Rafael Rodrigues. Generate the PERFECT answer.

RULES:
- English, BRIEF (2-4 sentences max), 100% human and natural
- First person, specific metrics from resume when relevant
- NO filler, NO generic phrases, NO explanations of why
- Just the answer he should speak

${RESUME_CONTEXT_FOR_LLM}`
        : `You are a technical expert helping with a coding/technical test.

RULES:
- Give ONLY the direct answer/code, NOTHING else
- NO explanations, NO comments unless part of the code
- SQL: exact query. Python: exact code. Multiple choice: ONLY the correct option
- Technical concept: 1-2 sentence direct answer max
- Ready to copy-paste directly into the test
- Be 100% accurate

${RESUME_CONTEXT_FOR_LLM}`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          ...(input.context ? [{ role: "user" as const, content: `Previous context: ${input.context}` }] : []),
          { role: "user", content: input.question },
        ],
      });

      const answer = typeof result.choices[0]?.message?.content === "string"
        ? result.choices[0].message.content : "";

      const summaryResult = await invokeLLM({
        messages: [
          { role: "system", content: input.mode === "interview"
            ? "Resuma em UMA ÚNICA FRASE CURTA em português brasileiro o que esta resposta está explicando. Máximo 15 palavras. Sem aspas."
            : "Resuma em UMA ÚNICA FRASE CURTA em português brasileiro o que esta resposta/código faz. Máximo 15 palavras. Sem aspas."
          },
          { role: "user", content: answer },
        ],
      });
      const summaryPtBr = typeof summaryResult.choices[0]?.message?.content === "string"
        ? summaryResult.choices[0].message.content : "";

      return { answer, summaryPtBr };
    }),

  processImage: publicProcedure
    .input(z.object({
      imageBase64: z.string(),
      context: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a technical expert helping with a coding/technical test.

RULES:
- Look at the image and give ONLY the direct answer/code
- NO explanations, NO reasoning, NO comments
- SQL: exact query. Python: exact code. Multiple choice: ONLY the correct option
- Ready to copy-paste directly
- Be 100% accurate

${RESUME_CONTEXT_FOR_LLM}`
          },
          ...(input.context ? [{ role: "user" as const, content: `Previous context: ${input.context}` }] : []),
          {
            role: "user",
            content: [
              { type: "text", text: "Give me the direct answer for this. No explanations." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${input.imageBase64}`, detail: "high" } },
            ],
          },
        ],
      });

      const answer = typeof result.choices[0]?.message?.content === "string"
        ? result.choices[0].message.content : "";

      const summaryResult = await invokeLLM({
        messages: [
          { role: "system", content: "Resuma em UMA ÚNICA FRASE CURTA em português brasileiro o que esta resposta/código faz. Máximo 15 palavras. Sem aspas." },
          { role: "user", content: answer },
        ],
      });
      const summaryPtBr = typeof summaryResult.choices[0]?.message?.content === "string"
        ? summaryResult.choices[0].message.content : "";

      return { answer, summaryPtBr };
    }),
});

export type AppRouter = typeof appRouter;
