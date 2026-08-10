import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Confidence = "verified" | "high_confidence" | "approximate" | "unverified" | "rejected" | "none";
export type Speed = "normal" | "slow";

export type Alternative = { text: string; note?: string | undefined; confidence: Confidence };

export type TranslationResult = {
  input: string;
  sourceLang: string;
  targetLang: string;
  translation: string | null;
  pronunciation: string | null;
  ipa: string | null;
  confidence: Confidence;
  source: string | null;
  matchType: "dictionary" | "phrase" | "ai" | "none";
  method: "direct" | "indirect" | "ai" | "none";
  pivotLang: string | null;
  alternatives: Alternative[];
  glossary: { source: string; target: string; pronunciation: string | null; confidence: string }[];
  notes: string | null;
};

const RANK: Record<string, number> = {
  verified: 5,
  high_confidence: 4,
  approximate: 3,
  unverified: 2,
  rejected: 0,
};

function db() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[ŋ]/g, "n")
    .replace(/[ɲ]/g, "n")
    .replace(/[ɛ]/g, "e")
    .replace(/[ɔ]/g, "o")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type TermRow = {
  id: string;
  concept_id: string;
  language_code: string;
  text: string;
  pronunciation: string | null;
  ipa: string | null;
  confidence: string;
  source_name: string | null;
  verified: boolean;
};

const TERM_FIELDS = "id, concept_id, language_code, text, pronunciation, ipa, confidence, source_name, verified";

function best(rows: TermRow[]) {
  return [...rows].sort((a, b) => (RANK[b.confidence] ?? 0) - (RANK[a.confidence] ?? 0))[0] ?? null;
}

async function termsByText(text: string, languageCode: string) {
  const supabase = db();
  const { data } = await supabase
    .from("terms")
    .select(TERM_FIELDS)
    .eq("language_code", languageCode)
    .eq("normalized", normalize(text))
    .limit(20);
  return (data ?? []) as TermRow[];
}

async function termsByConcepts(conceptIds: string[], languageCode: string) {
  if (conceptIds.length === 0) return [];
  const supabase = db();
  const { data } = await supabase
    .from("terms")
    .select(TERM_FIELDS)
    .eq("language_code", languageCode)
    .in("concept_id", conceptIds)
    .limit(40);
  return (data ?? []) as TermRow[];
}

/** Direct lookup source -> target through the shared concept. */
export async function lookupPair(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<TranslationResult | null> {
  const sourceTerms = await termsByText(text, sourceLang);
  if (sourceTerms.length === 0) return null;

  const conceptIds = Array.from(new Set(sourceTerms.map((t) => t.concept_id)));
  const targetTerms = await termsByConcepts(conceptIds, targetLang);
  if (targetTerms.length === 0) return null;

  const top = best(targetTerms)!;
  return {
    input: text,
    sourceLang,
    targetLang,
    translation: top.text,
    pronunciation: top.pronunciation,
    ipa: top.ipa,
    confidence: (top.confidence as Confidence) ?? "approximate",
    source: top.source_name,
    matchType: "dictionary",
    method: "direct",
    pivotLang: null,
    alternatives: targetTerms
      .filter((t) => t.id !== top.id)
      .map((t) => ({ text: t.text, note: t.pronunciation ?? undefined, confidence: t.confidence as Confidence })),
    glossary: [],
    notes: null,
  };
}

/** Indirect route through a pivot language when no direct pair exists. */
export async function lookupPivot(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<TranslationResult | null> {
  const pivots = ["es", "en"].filter((p) => p !== sourceLang && p !== targetLang);
  for (const pivot of pivots) {
    const toPivot = await lookupPair(text, sourceLang, pivot);
    if (!toPivot?.translation) continue;
    const fromPivot = await lookupPair(toPivot.translation, pivot, targetLang);
    if (!fromPivot?.translation) continue;
    const downgrade: Confidence =
      fromPivot.confidence === "verified" || fromPivot.confidence === "high_confidence"
        ? "approximate"
        : "unverified";
    return {
      ...fromPivot,
      input: text,
      sourceLang,
      confidence: downgrade,
      method: "indirect",
      pivotLang: pivot,
      notes: `Traducción indirecta a través de ${pivot === "es" ? "el español" : "el inglés"}.`,
    };
  }
  return null;
}

/** Word-by-word matches used as AI context and shown as recognised words. */
export async function glossary(text: string, sourceLang: string, targetLang: string) {
  const supabase = db();
  const words = Array.from(new Set(normalize(text).split(" ").filter(Boolean))).slice(0, 25);
  if (words.length === 0) return [];
  const { data } = await supabase
    .from("terms")
    .select(TERM_FIELDS)
    .eq("language_code", sourceLang)
    .in("normalized", words)
    .limit(60);
  const rows = (data ?? []) as TermRow[];
  const targets = await termsByConcepts(
    Array.from(new Set(rows.map((r) => r.concept_id))),
    targetLang,
  );
  return rows.flatMap((row) => {
    const match = best(targets.filter((t) => t.concept_id === row.concept_id));
    if (!match) return [];
    return [
      {
        source: row.text,
        target: match.text,
        pronunciation: match.pronunciation,
        confidence: match.confidence,
      },
    ];
  });
}

export async function languageNames() {
  const supabase = db();
  const { data } = await supabase.from("languages").select("code, name, tts_supported, tts_locale, region");
  return (data ?? []) as { code: string; name: string; tts_supported: boolean; tts_locale: string | null; region: string | null }[];
}

export async function logUnknownWord(text: string, languageCode: string) {
  try {
    await db().rpc("log_unknown_word", { _text: text, _language_code: languageCode });
  } catch {
    /* nunca bloquea la traducción */
  }
}

/* ------------------------------------------------------------------ AI --- */

async function aiJson(system: string, user: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (res.status === 429) throw new Error("Demasiadas peticiones de IA. Inténtalo en unos segundos.");
  if (res.status === 402) throw new Error("Se han agotado los créditos de IA del espacio de trabajo.");
  if (!res.ok) throw new Error(`Servicio de IA no disponible (${res.status}).`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function aiSuggest(
  text: string,
  sourceName: string,
  targetName: string,
  context: string,
) {
  const system = [
    "Eres un asistente lingüístico especializado en lenguas de África Occidental (mandinka de Senegal, Gambia y Guinea-Bisáu, bambara, wolof, malinké), español e inglés.",
    "Nunca mezcles variedades distintas sin avisarlo: mandinka, bambara, malinké y wolof son idiomas diferenciados.",
    "Si no estás razonablemente seguro, devuelve translation vacía y explica la duda en notes.",
    "La pronunciación debe escribirse para un hispanohablante, nunca inglesa.",
    'Responde SOLO con JSON: {"translation": string, "pronunciation": string, "notes": string}',
  ].join(" ");
  const user = `Traduce de ${sourceName} a ${targetName}: "${text}".\nEntradas verificadas del diccionario que pueden ayudar:\n${context || "(ninguna)"}`;
  const parsed = await aiJson(system, user);
  const translation = typeof parsed?.["translation"] === "string" ? (parsed["translation"] as string).trim() : "";
  if (!translation) return null;
  return {
    translation,
    pronunciation: typeof parsed?.["pronunciation"] === "string" ? (parsed["pronunciation"] as string).trim() : null,
    notes: typeof parsed?.["notes"] === "string" ? (parsed["notes"] as string).trim() : null,
  };
}

/** Language detection: dictionary evidence first, AI only to break ties. */
export async function detectLanguage(text: string) {
  const supabase = db();
  const words = Array.from(new Set(normalize(text).split(" ").filter(Boolean))).slice(0, 25);
  const scores = new Map<string, number>();
  if (words.length > 0) {
    const { data } = await supabase
      .from("terms")
      .select("language_code, normalized")
      .in("normalized", words)
      .limit(200);
    for (const row of (data ?? []) as { language_code: string }[]) {
      scores.set(row.language_code, (scores.get(row.language_code) ?? 0) + 1);
    }
  }
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const total = ranked.reduce((sum, [, n]) => sum + n, 0);
  const candidates = ranked.slice(0, 3).map(([code, n]) => ({ code, score: total ? n / total : 0 }));

  const clear = candidates[0] && candidates[0].score >= 0.6 && candidates[0].score > (candidates[1]?.score ?? 0);
  if (clear) return { language: candidates[0]!.code, candidates, ambiguous: false, method: "dictionary" as const };

  const langs = await languageNames();
  const parsed = await aiJson(
    'Identifica el idioma del texto. Opciones válidas exclusivamente los códigos indicados. Responde SOLO JSON: {"language": string, "confidence": number}',
    `Códigos: ${langs.map((l) => `${l.code} = ${l.name}`).join("; ")}\nTexto: "${text}"`,
  ).catch(() => null);
  const guess = typeof parsed?.["language"] === "string" ? (parsed["language"] as string) : null;
  const valid = guess && langs.some((l) => l.code === guess) ? guess : (candidates[0]?.code ?? null);
  return {
    language: valid,
    candidates: candidates.length > 0 ? candidates : valid ? [{ code: valid, score: 0.5 }] : [],
    ambiguous: candidates.length > 1 || !valid,
    method: "ai" as const,
  };
}

/* --------------------------------------------------------------- AUDIO --- */

export type SynthesisResult = {
  audio: string;
  mime: string;
  cached: boolean;
  provider: string;
  voice: string;
  speed: Speed;
  spokenText: string;
  approximate: boolean;
  notice: string | null;
};

const PROVIDER = "lovable/openai-gpt-4o-mini-tts";
const VOICE = "alloy";

async function requestTts(text: string, instructions: string, speed: Speed) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("El servicio de audio no está configurado.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini-tts",
      voice: VOICE,
      input: text,
      instructions,
      response_format: "mp3",
      speed: speed === "slow" ? 0.7 : 1,
    }),
  });
  if (res.status === 402) throw new Error("Se han agotado los créditos de audio del espacio de trabajo.");
  if (res.status === 429) throw new Error("Demasiadas peticiones de audio. Inténtalo en unos segundos.");
  if (!res.ok) throw new Error(`El generador de voz falló (${res.status}).`);
  const type = res.headers.get("content-type") ?? "";
  const buf = await res.arrayBuffer();
  if (!type.includes("audio") && !type.includes("octet-stream")) {
    throw new Error("El generador de voz devolvió un formato no reproducible.");
  }
  if (buf.byteLength < 512) throw new Error("El audio generado está vacío.");
  return Buffer.from(buf).toString("base64");
}

/**
 * Generates speech honouring real TTS coverage:
 * - languages with a voice are read in their own language
 * - languages without a voice fall back to the written pronunciation, clearly flagged
 */
export async function synthesize(options: {
  text: string;
  languageCode?: string | null;
  pronunciation?: string | null;
  speed?: Speed;
}): Promise<SynthesisResult> {
  const speed: Speed = options.speed === "slow" ? "slow" : "normal";
  const langs = await languageNames();
  const lang = options.languageCode ? langs.find((l) => l.code === options.languageCode) ?? null : null;
  const hasVoice = Boolean(lang?.tts_supported && lang.tts_locale);

  let spokenText = options.text.trim();
  let approximate = false;
  let notice: string | null = null;
  let instructions = "Lee el texto con voz natural, clara y bien articulada.";

  if (!hasVoice) {
    const guide = (options.pronunciation ?? "").trim();
    if (!guide) {
      throw new Error(
        `Audio nativo de este idioma no disponible${lang ? ` (${lang.name})` : ""}. Todavía no hay pronunciación escrita para leerla en voz alta.`,
      );
    }
    spokenText = guide;
    approximate = true;
    notice = `Audio nativo de ${lang?.name ?? "este idioma"} no disponible: se lee la pronunciación aproximada con fonética española.`;
    instructions = "Lee el texto con fonética española, sílaba a sílaba, con claridad.";
  } else if (lang?.tts_locale === "en") {
    instructions = "Read the text in natural English with clear pronunciation.";
  } else {
    instructions = "Lee el texto en español con voz natural y clara.";
  }

  if (speed === "slow") instructions += " Habla muy despacio, separando cada sílaba.";
  if (!spokenText) throw new Error("No hay texto para reproducir.");
  if (spokenText.length > 600) spokenText = spokenText.slice(0, 600);

  const cacheKey = createHash("sha256")
    .update([PROVIDER, VOICE, lang?.code ?? "auto", speed, approximate ? "guide" : "native", spokenText].join("|"))
    .digest("hex");

  const supabase = db();
  const { data: cached } = await supabase
    .from("audio_cache")
    .select("data_base64, mime_type")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (cached?.data_base64) {
    return {
      audio: cached.data_base64,
      mime: cached.mime_type,
      cached: true,
      provider: PROVIDER,
      voice: VOICE,
      speed,
      spokenText,
      approximate,
      notice,
    };
  }

  let audio: string;
  try {
    audio = await requestTts(spokenText, instructions, speed);
  } catch (first) {
    // un reintento automático antes de mostrar el error real
    try {
      audio = await requestTts(spokenText, instructions, speed);
    } catch {
      throw first instanceof Error ? first : new Error("No se pudo generar el audio.");
    }
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audio_cache").insert({
      cache_key: cacheKey,
      text: spokenText,
      language_code: lang?.code ?? null,
      speed,
      provider: PROVIDER,
      voice: VOICE,
      mime_type: "audio/mpeg",
      byte_size: Math.floor((audio.length * 3) / 4),
      data_base64: audio,
      verified: true,
    });
  } catch {
    /* la caché es un extra: si falla, el audio igualmente se devuelve */
  }

  return {
    audio,
    mime: "audio/mpeg",
    cached: false,
    provider: PROVIDER,
    voice: VOICE,
    speed,
    spokenText,
    approximate,
    notice,
  };
}

export async function transcribe(base64: string, mime: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("El servicio de voz no está configurado.");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.byteLength < 2048) throw new Error("La grabación está vacía. Inténtalo de nuevo.");
  const ext = mime.includes("wav") ? "wav" : mime.includes("mp4") ? "mp4" : mime.includes("mpeg") ? "mp3" : "webm";
  const form = new FormData();
  form.append("model", "openai/gpt-4o-mini-transcribe");
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), `grabacion.${ext}`);
  const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) throw new Error(`No se pudo transcribir el audio (${res.status}).`);
  const json = (await res.json()) as { text?: string };
  return json.text ?? "";
}
