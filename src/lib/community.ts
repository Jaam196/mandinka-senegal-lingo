import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId, getDisplayName } from "@/lib/identity";

/** Debe coincidir con public.normalize_term en la base de datos. */
export function normalizeTerm(text: string) {
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

export type Confirmation = {
  id: string;
  translation_version_id: string;
  device_id: string;
  display_name: string | null;
  confirmed: boolean;
  created_at: string;
};

export type CommunityVersion = {
  id: string;
  translation_id: string;
  version_number: number;
  source_text: string;
  translation: string;
  pronunciation: string | null;
  notes: string | null;
  device_id: string | null;
  display_name: string | null;
  created_at: string;
  change_type: string;
  reverted_from_version_id: string | null;
  translation_confirmations: Confirmation[];
};

export type CommunityTranslation = {
  id: string;
  source_text: string;
  source_normalized: string;
  source_lang: string;
  translation: string;
  target_lang: string;
  pronunciation: string | null;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_by_name: string | null;
  updated_by_device: string | null;
  updated_at: string;
  current_version_id: string | null;
  version_number: number;
  translation_versions: CommunityVersion[];
};

const SELECT = "*, translation_versions(*, translation_confirmations(*))";

export function sortedVersions(entry: CommunityTranslation | null | undefined) {
  return [...(entry?.translation_versions ?? [])].sort((a, b) => b.version_number - a.version_number);
}

export function currentVersion(entry: CommunityTranslation | null | undefined) {
  if (!entry) return null;
  return (
    entry.translation_versions.find((v) => v.id === entry.current_version_id) ??
    sortedVersions(entry)[0] ??
    null
  );
}

export function countVotes(version: CommunityVersion | null | undefined) {
  const list = version?.translation_confirmations ?? [];
  return {
    up: list.filter((c) => c.confirmed).length,
    down: list.filter((c) => !c.confirmed).length,
    mine: list.find((c) => c.device_id === getDeviceId()) ?? null,
  };
}

export function formatDate(value: string) {
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function useCommunityTranslation(sourceText: string, sourceLang: string, targetLang: string) {
  const normalized = normalizeTerm(sourceText ?? "");
  return useQuery({
    queryKey: ["community", normalized, sourceLang, targetLang],
    enabled: Boolean(normalized && sourceLang && targetLang && sourceLang !== targetLang),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_translations")
        .select(SELECT)
        .eq("source_normalized", normalized)
        .eq("source_lang", sourceLang)
        .eq("target_lang", targetLang)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as CommunityTranslation | null;
    },
  });
}

export type SaveInput = {
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  translation: string;
  pronunciation: string;
  notes: string;
};

export function useSaveCommunityTranslation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveInput) => {
      const { data, error } = await supabase.rpc("save_community_translation", {
        _source_text: input.sourceText,
        _source_lang: input.sourceLang,
        _target_lang: input.targetLang,
        _translation: input.translation,
        _pronunciation: input.pronunciation || "",
        _notes: input.notes || "",
        _device_id: getDeviceId(),
        _display_name: getDisplayName() || "Anónimo",
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["community"] });
      void qc.invalidateQueries({ queryKey: ["community-changes"] });
      void qc.invalidateQueries({ queryKey: ["community-list"] });
    },
  });
}

export function useConfirmVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { versionId: string; confirmed: boolean }) => {
      const { error } = await supabase.rpc("confirm_translation_version", {
        _version_id: input.versionId,
        _device_id: getDeviceId(),
        _display_name: getDisplayName() || "Anónimo",
        _confirmed: input.confirmed,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["community"] });
      void qc.invalidateQueries({ queryKey: ["community-changes"] });
      void qc.invalidateQueries({ queryKey: ["community-list"] });
    },
  });
}

export function useRevertVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const { error } = await supabase.rpc("revert_translation_version", {
        _version_id: versionId,
        _device_id: getDeviceId(),
        _display_name: getDisplayName() || "Administración",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["community"] });
      void qc.invalidateQueries({ queryKey: ["community-changes"] });
      void qc.invalidateQueries({ queryKey: ["community-list"] });
    },
  });
}

/** Historial global de cambios (panel de administración). */
export function useCommunityChanges(limit = 100) {
  return useQuery({
    queryKey: ["community-changes", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("translation_versions")
        .select(
          "*, translation_confirmations(*), community_translations(id,source_lang,target_lang,current_version_id)",
        )
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as (CommunityVersion & {
        community_translations: {
          id: string;
          source_lang: string;
          target_lang: string;
          current_version_id: string | null;
        } | null;
      })[];
    },
  });
}

/** Listado de aportaciones de la comunidad (diccionario colaborativo). */
export function useCommunityList(limit = 300) {
  return useQuery({
    queryKey: ["community-list", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_translations")
        .select(SELECT)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as CommunityTranslation[];
    },
  });
}
