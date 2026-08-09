import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, Star, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { playSpeech } from "@/lib/audio";
import { useCategories, useEntries } from "@/lib/dictionary";
import { makeId, useFavorites } from "@/lib/localStore";

export const Route = createFileRoute("/diccionario")({
  head: () => ({
    meta: [
      { title: "Diccionario Mandinka de Senegal ↔ Español" },
      {
        name: "description",
        content:
          "Busca palabras en mandinka de Senegal o en español: pronunciación, categoría, ejemplos, fuente y nivel de confianza.",
      },
      { property: "og:title", content: "Diccionario Mandinka de Senegal ↔ Español" },
      {
        property: "og:description",
        content: "Consulta palabras documentadas de mandinka de Senegal con su fuente y confianza.",
      },
    ],
  }),
  component: DictionaryPage,
});

function DictionaryPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const entries = useEntries();
  const categories = useCategories();
  const favorites = useFavorites();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (entries.data ?? []).filter((e) => {
      const matchesCategory = !category || e.category_slug === category;
      const matchesQuery =
        !q || e.mandinka.toLowerCase().includes(q) || e.spanish.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [entries.data, query, category]);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">📖 Diccionario</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Busca en las dos direcciones. Solo mostramos mandinka de Senegal.
      </p>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar una palabra..."
        className="mt-4 h-12 rounded-2xl bg-card"
      />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <Button
          size="sm"
          variant={category === null ? "default" : "secondary"}
          className="shrink-0 rounded-full"
          onClick={() => setCategory(null)}
        >
          Todas
        </Button>
        {(categories.data ?? []).map((c) => (
          <Button
            key={c.slug}
            size="sm"
            variant={category === c.slug ? "default" : "secondary"}
            className="shrink-0 rounded-full"
            onClick={() => setCategory(c.slug)}
          >
            {c.emoji} {c.name}
          </Button>
        ))}
      </div>

      {entries.isLoading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {entries.isError ? (
        <p className="mt-6 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          No se pudo cargar el diccionario. Comprueba tu conexión.
        </p>
      ) : null}

      {!entries.isLoading && results.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-muted p-4 text-sm">
          ❌ No tenemos ninguna entrada verificada para esa búsqueda.
        </p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {results.map((entry) => {
          const cat = (categories.data ?? []).find((c) => c.slug === entry.category_slug);
          return (
            <li key={entry.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{entry.mandinka}</p>
                  <p className="text-sm text-muted-foreground">{entry.spanish}</p>
                </div>
                <ConfidenceBadge level={entry.confidence} />
              </div>
              {entry.pronunciation ? (
                <p className="mt-2 text-sm">
                  Pronunciación: <span className="font-medium">{entry.pronunciation}</span>
                  {entry.ipa ? <span className="text-muted-foreground"> · IPA {entry.ipa}</span> : null}
                </p>
              ) : null}
              {cat ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {cat.emoji} {cat.name} · Variante: mandinka de Senegal
                </p>
              ) : null}
              {entry.example_mandinka ? (
                <p className="mt-2 rounded-xl bg-secondary/60 p-2 text-sm">
                  {entry.example_mandinka}
                  <span className="block text-muted-foreground">{entry.example_spanish}</span>
                </p>
              ) : null}
              {entry.source_name ? (
                <p className="mt-2 text-xs text-muted-foreground">Fuente: {entry.source_name}</p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    playSpeech(entry.pronunciation || entry.mandinka).catch(() =>
                      toast.error("No se pudo reproducir"),
                    )
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
                      kind: "palabra",
                      date: new Date().toISOString(),
                      input: entry.spanish,
                      output: entry.mandinka,
                      pronunciation: entry.pronunciation,
                      direction: "es-mnk",
                      confidence: entry.confidence,
                    });
                    toast.success("Guardado en favoritos");
                  }}
                >
                  <Star className="size-4" /> Guardar
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}