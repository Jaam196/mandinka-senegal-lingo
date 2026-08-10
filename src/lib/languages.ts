import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Language = {
  code: string;
  name: string;
  native_name: string | null;
  flag: string;
  region: string | null;
  family: string | null;
  tts_supported: boolean;
  tts_locale: string | null;
  sort_order: number;
};

export const FALLBACK_LANGUAGES: Language[] = [
  { code: "es", name: "Español", native_name: "Español", flag: "🇪🇸", region: "España", family: "Indoeuropea", tts_supported: true, tts_locale: "es", sort_order: 1 },
  { code: "en", name: "Inglés", native_name: "English", flag: "🇬🇧", region: "Reino Unido", family: "Indoeuropea", tts_supported: true, tts_locale: "en", sort_order: 2 },
  { code: "mnk-sn", name: "Mandinka de Senegal", native_name: "Mandinka", flag: "🇸🇳", region: "Senegal", family: "Mandé", tts_supported: false, tts_locale: null, sort_order: 3 },
  { code: "mnk-gm", name: "Mandinka de Gambia", native_name: "Mandinka", flag: "🇬🇲", region: "Gambia", family: "Mandé", tts_supported: false, tts_locale: null, sort_order: 4 },
  { code: "mnk-gw", name: "Mandinka de Guinea-Bisáu", native_name: "Mandinka", flag: "🇬🇼", region: "Guinea-Bisáu", family: "Mandé", tts_supported: false, tts_locale: null, sort_order: 5 },
  { code: "bm", name: "Bambara", native_name: "Bamanankan", flag: "🇲🇱", region: "Malí", family: "Mandé", tts_supported: false, tts_locale: null, sort_order: 6 },
  { code: "wo", name: "Wolof", native_name: "Wolof", flag: "🇸🇳", region: "Senegal", family: "Atlántica", tts_supported: false, tts_locale: null, sort_order: 7 },
  { code: "man", name: "Malinké", native_name: "Maninkakan", flag: "🇬🇳", region: "Guinea", family: "Mandé", tts_supported: false, tts_locale: null, sort_order: 8 },
];

const CACHE_KEY = "mnk_languages_cache_v1";

export function useLanguages() {
  return useQuery({
    queryKey: ["languages"],
    initialData: FALLBACK_LANGUAGES,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("languages").select("*").order("sort_order");
        if (error) throw error;
        const list = (data ?? []) as Language[];
        if (typeof window !== "undefined") window.localStorage.setItem(CACHE_KEY, JSON.stringify(list));
        return list.length > 0 ? list : FALLBACK_LANGUAGES;
      } catch {
        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem(CACHE_KEY);
          if (raw) return JSON.parse(raw) as Language[];
        }
        return FALLBACK_LANGUAGES;
      }
    },
  });
}

export function languageLabel(languages: Language[], code: string) {
  const lang = languages.find((l) => l.code === code);
  return lang ? `${lang.flag} ${lang.name}` : code;
}

export function findLanguage(languages: Language[], code: string) {
  return languages.find((l) => l.code === code) ?? FALLBACK_LANGUAGES.find((l) => l.code === code) ?? null;
}
