import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Direction = "es-mnk" | "mnk-es";
export type Confidence = "verified" | "probable" | "approximate" | "unverified" | "none";

export type TranslationResult = {
  input: string;
  direction: Direction;
  translation: string | null;
  pronunciation: string | null;
  confidence: Confidence;
  source: string | null;
  matchType: "dictionary" | "phrase" | "ai" | "none";
  alternatives: { text: string; note?: string | undefined }[];
  notes: string | null;
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

const clean = (s: string) => s.trim().toLowerCase().replace(/[¿?¡!.,;:]/g, "").replace(/\s+/g, " ");

export async function lookupTranslation(text: string, direction: Direction): Promise<TranslationResult | null> {
  const supabase = db();
  const q = clean(text);
  if (!q) return null;

  const { data: phrases } = await supabase
    .from("phrases")
    .select("spanish, mandinka, pronunciation, confidence, source_name")
    .limit(500);

  const phraseHit = (phrases ?? []).find((p) =>
    direction === "es-mnk" ? clean(p.spanish) === q : clean(p.mandinka) === q,
  );
  if (phraseHit) {
    return {
      input: text,
      direction,
      translation: direction === "es-mnk" ? phraseHit.mandinka : phraseHit.spanish,
      pronunciation: phraseHit.pronunciation,
      confidence: phraseHit.confidence as Confidence,
      source: phraseHit.source_name,
      matchType: "phrase",
      alternatives: [],
      notes: null,
    };
  }

  const column = direction === "es-mnk" ? "spanish_normalized" : "mandinka_normalized";
  const { data: entries } = await supabase
    .from("dictionary_entries")
    .select("mandinka, spanish, pronunciation, confidence, source_name, region")
    .eq(column, q)
    .limit(10);

  if (entries && entries.length > 0) {
    const first = entries[0]!;
    return {
      input: text,
      direction,
      translation: direction === "es-mnk" ? first.mandinka : first.spanish,
      pronunciation: first.pronunciation,
      confidence: first.confidence as Confidence,
      source: first.source_name,
      matchType: "dictionary",
      alternatives: entries.slice(1).map((e) => ({
        text: direction === "es-mnk" ? e.mandinka : e.spanish,
        note: e.pronunciation ?? undefined,
      })),
      notes: null,
    };
  }
  return null;
}

export async function glossary(text: string, direction: Direction) {
  const supabase = db();
  const words = Array.from(new Set(clean(text).split(" "))).slice(0, 25);
  if (words.length === 0) return [];
  const column = direction === "es-mnk" ? "spanish_normalized" : "mandinka_normalized";
  const { data } = await supabase
    .from("dictionary_entries")
    .select("mandinka, spanish, pronunciation, confidence")
    .in(column, words)
    .limit(60);
  return data ?? [];
}

export async function aiSuggest(text: string, direction: Direction, context: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;
  const target = direction === "es-mnk" ? "mandinka de Senegal" : "español";
  const system = [
    "Eres un asistente lingüístico especializado EXCLUSIVAMENTE en mandinka de Senegal.",
    "Nunca mezcles bambara, wolof, malinké ni mandinka de Gambia/Guinea-Bisáu sin avisarlo.",
    "Si no estás razonablemente seguro, responde con translation vacía y explica la duda.",
    "La pronunciación debe escribirse para un hispanohablante (nunca inglesa).",
    "Responde SOLO con JSON: {\"translation\": string, \"pronunciation\": string, \"notes\": string}",
  ].join(" ");
  const user = `Traduce al ${target}: "${text}".\nEntradas verificadas del diccionario que pueden ayudar:\n${context || "(ninguna)"}`;

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
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI ${res.status}: ${body}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { translation?: string; pronunciation?: string; notes?: string };
    if (!parsed.translation?.trim()) return null;
    return {
      translation: parsed.translation.trim(),
      pronunciation: parsed.pronunciation?.trim() ?? null,
      notes: parsed.notes?.trim() ?? null,
    };
  } catch {
    return null;
  }
}

export async function synthesize(text: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Falta la clave de IA");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
      instructions: "Lee el texto con fonética española, sílaba a sílaba, con claridad y ritmo pausado.",
      response_format: "mp3",
    }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${await res.text().catch(() => "")}`);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf).toString("base64");
}

export async function transcribe(base64: string, mime: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Falta la clave de IA");
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
  if (!res.ok) throw new Error(`STT ${res.status}: ${await res.text().catch(() => "")}`);
  const json = (await res.json()) as { text?: string };
  return json.text ?? "";
}