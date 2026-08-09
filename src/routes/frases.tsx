import { createFileRoute } from "@tanstack/react-router";
import { Star, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { Button } from "@/components/ui/button";
import { playSpeech } from "@/lib/audio";
import { usePhrases } from "@/lib/dictionary";
import { makeId, useFavorites } from "@/lib/localStore";

export const Route = createFileRoute("/frases")({
  head: () => ({
    meta: [
      { title: "Frases útiles en mandinka de Senegal" },
      {
        name: "description",
        content:
          "Frases esenciales en mandinka de Senegal con su traducción al español, pronunciación y audio.",
      },
      { property: "og:title", content: "Frases útiles en mandinka de Senegal" },
      {
        property: "og:description",
        content: "Saludos, compras, salud y conversación básica en mandinka de Senegal.",
      },
    ],
  }),
  component: PhrasesPage,
});

function PhrasesPage() {
  const phrases = usePhrases();
  const favorites = useFavorites();

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">💬 Frases útiles</h1>
      <p className="mt-1 text-sm text-muted-foreground">Expresiones del día a día en mandinka de Senegal.</p>

      <ul className="mt-4 space-y-3">
        {(phrases.data ?? []).map((p) => (
          <li key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{p.spanish}</p>
                <p className="text-lg font-semibold">{p.mandinka}</p>
                {p.pronunciation ? (
                  <p className="text-sm text-muted-foreground">{p.pronunciation}</p>
                ) : null}
              </div>
              <ConfidenceBadge level={p.confidence} />
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  playSpeech(p.pronunciation || p.mandinka).catch(() => toast.error("No se pudo reproducir"))
                }
              >
                <Volume2 className="size-4" /> Escuchar
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  favorites.add({
                    id: makeId(),
                    kind: "frase",
                    date: new Date().toISOString(),
                    input: p.spanish,
                    output: p.mandinka,
                    pronunciation: p.pronunciation,
                    direction: "es-mnk",
                    confidence: p.confidence,
                  });
                  toast.success("Guardado en favoritos");
                }}
              >
                <Star className="size-4" /> Guardar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}