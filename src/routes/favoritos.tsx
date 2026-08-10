import { createFileRoute } from "@tanstack/react-router";
import { Trash2, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { Button } from "@/components/ui/button";
import { playSpeech, speechFor } from "@/lib/audio";
import { useFavorites } from "@/lib/localStore";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Mis favoritos · Mandinka de Senegal" },
      {
        name: "description",
        content: "Tus palabras, frases y traducciones guardadas en mandinka de Senegal, en tu dispositivo.",
      },
      { property: "og:title", content: "Mis favoritos · Mandinka de Senegal" },
      { property: "og:description", content: "Palabras y frases guardadas para repasar cuando quieras." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const favorites = useFavorites();

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">⭐ Mis favoritos</h1>
      <p className="mt-1 text-sm text-muted-foreground">Se guardan solo en este dispositivo.</p>

      {favorites.items.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-muted p-4 text-sm">Todavía no has guardado nada.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {favorites.items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.kind}</p>
                  <p className="text-sm text-muted-foreground">{item.input}</p>
                  <p className="text-lg font-semibold">{item.output}</p>
                  {item.pronunciation ? (
                    <p className="text-sm text-muted-foreground">{item.pronunciation}</p>
                  ) : null}
                </div>
                <ConfidenceBadge level={item.confidence} />
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const s = speechFor(item.direction, item.output, item.pronunciation);
                    playSpeech(s.text, s.style).catch(() => toast.error("No se pudo reproducir"));
                  }}
                >
                  <Volume2 className="size-4" /> Escuchar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => favorites.remove(item.id)}>
                  <Trash2 className="size-4" /> Quitar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {favorites.items.length > 0 ? (
        <Button variant="destructive" className="mt-4" onClick={favorites.clear}>
          Eliminar todos los favoritos
        </Button>
      ) : null}
    </AppShell>
  );
}