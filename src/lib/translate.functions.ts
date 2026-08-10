import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const langCode = z.string().min(2).max(12);

export const translateText = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        text: z.string().trim().min(1).max(1200),
        sourceLang: langCode,
        targetLang: langCode,
        allowAi: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const mod = await import("./translate.server");
    const { text, sourceLang, targetLang } = data;

    if (sourceLang === targetLang) {
      return {
        input: text,
        sourceLang,
        targetLang,
        translation: text,
        pronunciation: null,
        ipa: null,
        confidence: "verified" as const,
        source: null,
        matchType: "dictionary" as const,
        method: "direct" as const,
        pivotLang: null,
        alternatives: [],
        glossary: [],
        notes: "El idioma de origen y el de destino son el mismo.",
      };
    }

    const direct = await mod.lookupPair(text, sourceLang, targetLang);
    if (direct) return direct;

    const pivot = await mod.lookupPivot(text, sourceLang, targetLang);
    if (pivot) return pivot;

    const words = await mod.glossary(text, sourceLang, targetLang);
    void mod.logUnknownWord(text, sourceLang);

    const empty = {
      input: text,
      sourceLang,
      targetLang,
      translation: null,
      pronunciation: null,
      ipa: null,
      confidence: "none" as const,
      source: null,
      matchType: "none" as const,
      method: "none" as const,
      pivotLang: null,
      alternatives: [],
      glossary: words,
      notes: null,
    };

    if (!data.allowAi) return empty;

    const langs = await mod.languageNames();
    const nameOf = (code: string) => langs.find((l) => l.code === code)?.name ?? code;
    const context = words
      .map((w) => `${w.source} = ${w.target} (${w.pronunciation ?? "-"}, ${w.confidence})`)
      .join("\n");

    const ai = await mod.aiSuggest(text, nameOf(sourceLang), nameOf(targetLang), context);
    if (!ai) return empty;

    return {
      ...empty,
      translation: ai.translation,
      pronunciation: ai.pronunciation,
      confidence: "unverified" as const,
      source: "Sugerencia generada por IA (no verificada)",
      matchType: "ai" as const,
      method: "ai" as const,
      notes: ai.notes,
    };
  });

export const speakText = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        text: z.string().trim().min(1).max(600),
        languageCode: langCode.nullable().default(null),
        pronunciation: z.string().trim().max(600).nullable().default(null),
        speed: z.enum(["normal", "slow"]).default("normal"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { synthesize } = await import("./translate.server");
    return synthesize(data);
  });

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ audio: z.string().min(10), mime: z.string().min(3).max(60) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { transcribe } = await import("./translate.server");
    return { text: await transcribe(data.audio, data.mime) };
  });

export const detectTextLanguage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ text: z.string().trim().min(1).max(600) }).parse(input))
  .handler(async ({ data }) => {
    const { detectLanguage } = await import("./translate.server");
    return detectLanguage(data.text);
  });
