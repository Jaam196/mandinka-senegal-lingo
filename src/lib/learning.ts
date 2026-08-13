import { useCallback, useEffect, useState } from "react";

export type CardProgress = {
  id: string;
  correct: number;
  wrong: number;
  lastSeen: string;
  /** Nivel de repetición espaciada: 0 = nuevo, 5 = aprendido. */
  level: number;
};

const KEY = "mnk_learning_v1";

function read(): Record<string, CardProgress> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, CardProgress>;
  } catch {
    return {};
  }
}

function write(value: Record<string, CardProgress>) {
  window.localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("mnk-learning"));
}

export function useLearning() {
  const [progress, setProgress] = useState<Record<string, CardProgress>>({});

  useEffect(() => {
    const sync = () => setProgress(read());
    sync();
    window.addEventListener("mnk-learning", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("mnk-learning", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const record = useCallback((id: string, ok: boolean) => {
    const all = read();
    const prev = all[id] ?? { id, correct: 0, wrong: 0, lastSeen: "", level: 0 };
    all[id] = {
      ...prev,
      correct: prev.correct + (ok ? 1 : 0),
      wrong: prev.wrong + (ok ? 0 : 1),
      level: ok ? Math.min(5, prev.level + 1) : 0,
      lastSeen: new Date().toISOString(),
    };
    write(all);
  }, []);

  const reset = useCallback(() => write({}), []);

  const learned = Object.values(progress).filter((p) => p.level >= 4).length;
  const studied = Object.keys(progress).length;

  return { progress, record, reset, learned, studied };
}

/** Ordena por prioridad: nunca vistas primero, luego las falladas. */
export function orderByPriority<T extends { id: string }>(
  items: T[],
  progress: Record<string, CardProgress>,
) {
  return [...items].sort((a, b) => {
    const pa = progress[a.id];
    const pb = progress[b.id];
    const la = pa ? pa.level : -1;
    const lb = pb ? pb.level : -1;
    return la - lb;
  });
}
