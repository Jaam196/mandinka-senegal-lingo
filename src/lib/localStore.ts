import { useCallback, useEffect, useState } from "react";

export type Direction = "es-mnk" | "mnk-es";

export type HistoryItem = {
  id: string;
  date: string;
  input: string;
  output: string;
  pronunciation: string | null;
  direction: Direction;
  confidence: string;
};

export type FavoriteItem = HistoryItem & { kind: "palabra" | "frase" | "traduccion" };

const HISTORY_KEY = "mnk_history_v1";
const FAVORITES_KEY = "mnk_favorites_v1";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("mnk-store", { detail: key }));
}

function useStore<T extends { id: string }>(key: string) {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    setItems(read<T>(key));
    const sync = () => setItems(read<T>(key));
    window.addEventListener("mnk-store", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("mnk-store", sync);
      window.removeEventListener("storage", sync);
    };
  }, [key]);

  const add = useCallback(
    (item: T, limit = 200) => {
      const next = [item, ...read<T>(key).filter((i) => i.id !== item.id)].slice(0, limit);
      write(key, next);
    },
    [key],
  );

  const remove = useCallback(
    (id: string) => write(key, read<T>(key).filter((i) => i.id !== id)),
    [key],
  );

  const clear = useCallback(() => write(key, []), [key]);

  return { items, add, remove, clear };
}

export const useHistory = () => useStore<HistoryItem>(HISTORY_KEY);
export const useFavorites = () => useStore<FavoriteItem>(FAVORITES_KEY);

export function clearAllLocalData() {
  write(HISTORY_KEY, []);
  write(FAVORITES_KEY, []);
  if (typeof window !== "undefined") window.localStorage.removeItem("mnk_dictionary_cache_v1");
}

export function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}