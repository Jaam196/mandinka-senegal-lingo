import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, RotateCcw, Volume2, X } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { LanguageSelect } from "@/components/LanguageSelect";
import { Button } from "@/components/ui/button";
import { playSpeech } from "@/lib/audio";
import { useConcepts } from "@/lib/concepts";
import { orderByPriority, useLearning } from "@/lib/learning";

export const Route = createFileRoute("/aprender")({
  head: () => ({
    meta: [
      { title: "Aprender vocabulario mandinka y lenguas de África Occidental" },
      {
        name: "description",
        content:
          "Tarjetas de memoria y test de vocabulario en mandinka, bambara, wolof y malinké con pronunciación y seguimiento de progreso.",
      },
      { property: "og:title", content: "Aprender vocabulario con tarjetas" },
      {
        property: "og:description",
        content: "Practica vocabulario verificado con tarjetas, audio y seguimiento de tu progreso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LearnPage,
});

type Card = { id: string; prompt: string; answer: string; pronunciation: string | null };

function LearnPage() {
  const concepts = useConcepts();
  const learning = useLearning();
  const [lang, setLang] = useState("mnk-sn");
  const [mode, setMode] = useState<"flash" | "quiz">("flash");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);

  const cards = useMemo<Card[]>(() => {
    const list: Card[] = [];
    for (const c of concepts.data ?? []) {
      const term = c.terms.find((t) => t.language_code === lang);
      if (!term) continue;
      list.push({
        id: `${c.id}:${lang}`,
        prompt: c.gloss_es,
        answer: term.text,
        pronunciation: term.pronunciation,
      });
    }
    return orderByPriority(list, learning.progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concepts.data, lang]);

  const card = cards[index % Math.max(1, cards.length)];

  const options = useMemo(() => {
    if (!card || mode !== "quiz") return [];
    const others = cards.filter((c) => c.id !== card.id).slice(0, 30);
    const picks = others.sort(() => Math.random() - 0.5).slice(0, 3);
    return [...picks, card].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id, mode]);

  function next(ok: boolean) {
    if (card) learning.record(card.id, ok);
    setRevealed(false);
    setChoice(null);
    setIndex((i) => i + 1);
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">🎓 Aprender</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Practica vocabulario documentado con tarjetas o test. Tu progreso se guarda en tu dispositivo.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <LanguageSelect value={lang} onChange={setLang} />
        <Button variant={mode === "flash" ? "default" : "secondary"} size="sm" onClick={() => setMode("flash")}>
          Tarjetas
        </Button>
        <Button variant={mode === "quiz" ? "default" : "secondary"} size="sm" onClick={() => setMode("quiz")}>
          Test
        </Button>
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Estudiadas: <strong className="text-foreground">{learning.studied}</strong> · Aprendidas:{" "}
        <strong className="text-foreground">{learning.learned}</strong>
        <Button variant="ghost" size="sm" className="ml-2" onClick={learning.reset}>
          <RotateCcw className="size-4" /> Reiniciar
        </Button>
      </div>

      {!card ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Todavía no hay vocabulario documentado en este idioma.
        </p>
      ) : (
        <section className="mt-4 rounded-3xl border border-border bg-card p-6 text-center shadow-soft">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">¿Cómo se dice?</p>
          <p className="mt-2 text-2xl font-bold">{card.prompt}</p>

          {mode === "flash" ? (
            <>
              {revealed ? (
                <div className="mt-4">
                  <p className="text-xl font-semibold text-primary">{card.answer}</p>
                  {card.pronunciation ? (
                    <p className="text-sm text-muted-foreground">🗣️ {card.pronunciation}</p>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3"
                    onClick={() =>
                      playSpeech({
                        text: card.answer,
                        languageCode: lang,
                        pronunciation: card.pronunciation,
                      }).catch(() => toast.error("No se pudo reproducir"))
                    }
                  >
                    <Volume2 className="size-4" /> Escuchar
                  </Button>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button variant="secondary" onClick={() => next(false)}>
                      <X className="size-4" /> No la sabía
                    </Button>
                    <Button onClick={() => next(true)}>
                      <Check className="size-4" /> La sabía
                    </Button>
                  </div>
                </div>
              ) : (
                <Button className="mt-5" onClick={() => setRevealed(true)}>
                  Mostrar respuesta
                </Button>
              )}
            </>
          ) : (
            <div className="mt-5 grid gap-2">
              {options.map((o) => {
                const isRight = o.id === card.id;
                const picked = choice === o.id;
                return (
                  <Button
                    key={o.id}
                    variant={choice ? (isRight ? "default" : picked ? "destructive" : "secondary") : "secondary"}
                    onClick={() => {
                      if (choice) return;
                      setChoice(o.id);
                      learning.record(card.id, isRight);
                    }}
                  >
                    {o.answer}
                  </Button>
                );
              })}
              {choice ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setChoice(null);
                    setIndex((i) => i + 1);
                  }}
                >
                  Siguiente →
                </Button>
              ) : null}
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}
