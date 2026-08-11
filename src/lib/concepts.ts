import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Term = {
  id: string;
  concept_id: string;
  language_code: string;
  text: string;
  pronunciation: string | null;
  ipa: string | null;
  example_text: string | null;
  example_translation: string | null;
  region: string | null;
  source_name: string | null;
  confidence: string;
  verified: boolean;
  notes: string | null;
};

export type ConceptWithTerms = {
  id: string;
  slug: string;
  kind: string;
  category_slug: string | null;
  gloss_es: string;
  gloss_en: string | null;
  terms: Term[];
};

const CACHE = "mnk_concepts_cache_v1";

export function useConcepts() {
  return useQuery({
    queryKey: ["concepts-with-terms"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("concepts")
          .select(
            "id,slug,kind,category_slug,gloss_es,gloss_en,terms(id,concept_id,language_code,text,pronunciation,ipa,example_text,example_translation,region,source_name,confidence,verified,notes)",
          )
          .order("gloss_es", { ascending: true });
        if (error) throw error;
        const list = (data ?? []) as unknown as ConceptWithTerms[];
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(CACHE, JSON.stringify(list));
          } catch {
            /* almacenamiento lleno */
          }
        }
        return list;
      } catch (error) {
        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem(CACHE);
          if (raw) return JSON.parse(raw) as ConceptWithTerms[];
        }
        throw error;
      }
    },
  });
}

export function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}