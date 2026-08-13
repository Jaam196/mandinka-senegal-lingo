import { Volume2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { playSpeech } from "@/lib/audio";
import { usePhrases } from "@/lib/dictionary";

export function PhraseOfTheDay() {
  const phrases = usePhrases();
  const list = phrases.data ?? [];
  if (list.length === 0) return null;

  const day = Math.floor(Date.now() / 86_400_000);
  const phrase = list[day % list.length]!;

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Frase del día</p>
      <p className="mt-1 text-lg font-semibold">{phrase.mandinka}</p>
      <p className="text-sm text-muted-foreground">{phrase.spanish}</p>
      {phrase.pronunciation ? (
        <p className="text-sm text-muted-foreground">🗣️ {phrase.pronunciation}</p>
      ) : null}
      <Button
        size="sm"
        variant="secondary"
        className="mt-3"
        onClick={() =>
          playSpeech({
            text: phrase.mandinka,
            languageCode: "mnk-sn",
            pronunciation: phrase.pronunciation,
          }).catch(() => toast.error("No se pudo reproducir"))
        }
      >
        <Volume2 className="size-4" /> Escuchar
      </Button>
    </section>
  );
}
