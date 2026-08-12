import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, Plus, Star, Users, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { CommunityPanel } from "@/components/CommunityPanel";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { TranslationEditorDialog } from "@/components/TranslationEditorDialog";
import { LanguageSelect } from "@/components/LanguageSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { playSpeech } from "@/lib/audio";
import { useCategories } from "@/lib/dictionary";
import { normalize, useConcepts, type Term } from "@/lib/concepts";
import { useLanguages } from "@/lib/languages";
import { makeId, useFavorites } from "@/lib/localStore";

export const Route = createFileRoute("/diccionario")({
  head: () => ({
    meta: [
      { title: "Diccionario multilingüe de África Occidental" },
      {
        name: "description",
        content:
          "Busca palabras en mandinka, bambara, wolof, malinké, español o inglés: pronunciación, categoría, fuente y nivel de confianza.",
      },
      { property: "og:title", content: "Diccionario multilingüe de África Occidental" },
      {
        property: "og:description",
        content: "Consulta palabras documentadas en 8 idiomas con su fuente y su nivel de confianza.",
      },
    ],
  }),
  component: DictionaryPage,
});

const ALL = "all";

function DictionaryPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [lang, setLang] = useState<string>(ALL);
  const concepts = useConcepts();
  const categories = useCategories();
  const { data: languages = [] } = useLanguages();
  const favorites = useFavorites();
  const [adding, setAdding] = useState(false);
  const [openCommunity, setOpenCommunity] = useState<string | null>(null);

  const labelOf = (code: string) => {
    const l = languages.find((x) => x.code === code);
    return l ? `${l.flag} ${l.name}` : code;
  };

  const results = useMemo(() => {
    const q = normalize(query);
    return (concepts.data ?? [])
      .map((concept) => {
        const terms = (concept.terms ?? []).filter((t) => lang === ALL || t.language_code === lang);
        return { ...concept, visibleTerms: terms };
      })
      .filter((concept) => {
        if (lang !== ALL && concept.visibleTerms.length === 0) return false;
        if (category && concept.category_slug !== category) return false;
        if (!q) return true;
        if (normalize(concept.gloss_es).includes(q)) return true;
        if (concept.gloss_en && normalize(concept.gloss_en).includes(q)) return true;
        return (concept.terms ?? []).some(
          (t) => normalize(t.text).includes(q) || normalize(t.pronunciation ?? "").includes(q),
        );
      });
  }, [concepts.data, query, category, lang]);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">📖 Diccionario</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Busca en cualquier idioma. Elige uno concreto o consulta todos a la vez.
      </p>

      <Button className="mt-3 w-full rounded-2xl" variant="secondary" onClick={() => setAdding(true)}>
        <Plus className="size-4" /> Añadir traducción
      </Button>

      <TranslationEditorDialog
        open={adding}
        onOpenChange={setAdding}
        mode="new"
        initial={{
          sourceText: query.trim(),
          sourceLang: "es",
          targetLang: lang === ALL ? "mnk-sn" : lang,
          translation: "",
          pronunciation: "",
          notes: "",
        }}
      />

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar una palabra..."
        className="mt-4 h-12 rounded-2xl bg-card"
      />

      <div className="mt-3 flex items-center gap-2">
        <Button
          size="sm"
          variant={lang === ALL ? "default" : "secondary"}
          className="shrink-0 rounded-full"
          onClick={() => setLang(ALL)}
        >
          🌍 Todos
        </Button>
        <LanguageSelect
          label="Filtrar por idioma"
          value={lang === ALL ? "" : lang}
          onChange={setLang}
        />
      </div>

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

      {concepts.isLoading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {concepts.isError ? (
        <p className="mt-6 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          No se pudo cargar el diccionario. Comprueba tu conexión.
        </p>
      ) : null}

      {!concepts.isLoading && results.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-muted p-4 text-sm">
          ❌ No tenemos ninguna entrada verificada para esa búsqueda.
        </p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {results.map((concept) => {
          const cat = (categories.data ?? []).find((c) => c.slug === concept.category_slug);
          const shown: Term[] = [...concept.visibleTerms].sort((a, b) =>
            a.language_code.localeCompare(b.language_code),
          );
          return (
            <li key={concept.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <p className="text-lg font-semibold">{concept.gloss_es}</p>
              {concept.gloss_en ? (
                <p className="text-sm text-muted-foreground">{concept.gloss_en}</p>
              ) : null}
              {cat ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {cat.emoji} {cat.name}
                </p>
              ) : null}

              <ul className="mt-3 space-y-2">
                {shown.map((term) => (
                  <li key={term.id} className="rounded-xl bg-secondary/50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{labelOf(term.language_code)}</p>
                        <p className="text-base font-semibold">{term.text}</p>
                        {term.pronunciation ? (
                          <p className="text-sm text-muted-foreground">
                            🔊 {term.pronunciation}
                            {term.ipa ? <span> · IPA {term.ipa}</span> : null}
                          </p>
                        ) : null}
                        {term.example_text ? (
                          <p className="mt-1 text-sm">
                            {term.example_text}
                            <span className="block text-muted-foreground">
                              {term.example_translation}
                            </span>
                          </p>
                        ) : null}
                        {term.source_name ? (
                          <p className="mt-1 text-xs text-muted-foreground">Fuente: {term.source_name}</p>
                        ) : null}
                      </div>
                      <ConfidenceBadge level={term.confidence} />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          playSpeech({
                            text: term.text,
                            languageCode: term.language_code,
                            pronunciation: term.pronunciation,
                          }).catch(() => toast.error("No se pudo reproducir"))
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
                            input: concept.gloss_es,
                            output: term.text,
                            pronunciation: term.pronunciation,
                            direction: `es>${term.language_code}`,
                            sourceLang: "es",
                            targetLang: term.language_code,
                            confidence: term.confidence,
                          });
                          toast.success("Guardado en favoritos");
                        }}
                      >
                        <Star className="size-4" /> Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setOpenCommunity(openCommunity === term.id ? null : term.id)}
                      >
                        <Users className="size-4" /> Comunidad
                      </Button>
                    </div>
                    {openCommunity === term.id ? (
                      <CommunityPanel
                        sourceText={concept.gloss_es}
                        sourceLang="es"
                        targetLang={term.language_code}
                        fallback={{
                          translation: term.text,
                          pronunciation: term.pronunciation,
                          notes: term.notes,
                        }}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}