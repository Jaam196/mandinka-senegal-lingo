import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Entry = {
  id: string;
  mandinka: string;
  spanish: string;
  pronunciation: string | null;
  ipa: string | null;
  category_slug: string | null;
  alternative_meanings: string[];
  synonyms: string[];
  example_mandinka: string | null;
  example_spanish: string | null;
  region: string;
  source_name: string | null;
  source_url: string | null;
  source_type: string | null;
  confidence: string;
  verified: boolean;
  notes: string | null;
};

export type Phrase = {
  id: string;
  spanish: string;
  mandinka: string;
  pronunciation: string | null;
  category_slug: string | null;
  confidence: string;
  source_name: string | null;
};

export type Category = { id: string; slug: string; name: string; emoji: string; sort_order: number };

const CACHE = "mnk_dictionary_cache_v1";

function cacheRead<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${CACHE}:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function cacheWrite<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${CACHE}:${key}`, JSON.stringify(value));
  } catch {
    /* almacenamiento lleno: se ignora */
  }
}

export function useEntries() {
  return useQuery({
    queryKey: ["entries"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("dictionary_entries")
          .select("*")
          .order("mandinka", { ascending: true });
        if (error) throw error;
        cacheWrite("entries", data);
        return data as unknown as Entry[];
      } catch (error) {
        const cached = cacheRead<Entry[]>("entries");
        if (cached) return cached;
        throw error;
      }
    },
  });
}

export function usePhrases() {
  return useQuery({
    queryKey: ["phrases"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("phrases")
          .select("*")
          .order("sort_order", { ascending: true });
        if (error) throw error;
        cacheWrite("phrases", data);
        return data as unknown as Phrase[];
      } catch (error) {
        const cached = cacheRead<Phrase[]>("phrases");
        if (cached) return cached;
        throw error;
      }
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("sort_order", { ascending: true });
        if (error) throw error;
        cacheWrite("categories", data);
        return data as unknown as Category[];
      } catch (error) {
        const cached = cacheRead<Category[]>("categories");
        if (cached) return cached;
        throw error;
      }
    },
  });
}