import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const translateText = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        text: z.string().trim().min(1).max(1200),
        direction: z.enum(["es-mnk", "mnk-es"]),
        allowAi: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { lookupTranslation, glossary, aiSuggest } = await import("./translate.server");

    const exact = await lookupTranslation(data.text, data.direction);
    if (exact) return exact;

    const words = await glossary(data.text, data.direction);
    const context = words
      .map((w) => `${w.mandinka} = ${w.spanish} (${w.pronunciation ?? "-"}, ${w.confidence})`)
      .join("\n");

    if (!data.allowAi) {
      return {
        input: data.text,
        direction: data.direction,
        translation: null,
        pronunciation: null,
        confidence: "none" as const,
        source: null,
        matchType: "none" as const,
        alternatives: words.map((w) => ({
          text: data.direction === "es-mnk" ? w.mandinka : w.spanish,
          note: w.pronunciation ?? undefined,
        })),
        notes: null,
      };
    }

    const ai = await aiSuggest(data.text, data.direction, context);
    if (!ai) {
      return {
        input: data.text,
        direction: data.direction,
        translation: null,
        pronunciation: null,
        confidence: "none" as const,
        source: null,
        matchType: "none" as const,
        alternatives: words.map((w) => ({
          text: data.direction === "es-mnk" ? w.mandinka : w.spanish,
          note: w.pronunciation ?? undefined,
        })),
        notes: null,
      };
    }

    return {
      input: data.text,
      direction: data.direction,
      translation: ai.translation,
      pronunciation: ai.pronunciation,
      confidence: "unverified" as const,
      source: "Sugerencia generada por IA (no verificada)",
      matchType: "ai" as const,
      alternatives: words.map((w) => ({
        text: data.direction === "es-mnk" ? w.mandinka : w.spanish,
        note: w.pronunciation ?? undefined,
      })),
      notes: ai.notes,
    };
  });

export const speakText = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        text: z.string().trim().min(1).max(600),
        style: z.enum(["phonetic", "natural"]).default("phonetic"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { synthesize } = await import("./translate.server");
    return { audio: await synthesize(data.text, data.style) };
  });

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ audio: z.string().min(10), mime: z.string().min(3).max(60) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { transcribe } = await import("./translate.server");
    return { text: await transcribe(data.audio, data.mime) };
  });