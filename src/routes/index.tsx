import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeftRight, Copy, Loader2, Mic, Plus, Square, Star, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PhraseOfTheDay } from "@/components/PhraseOfTheDay";
import { CommunityPanel } from "@/components/CommunityPanel";
import { TranslationEditorDialog } from "@/components/TranslationEditorDialog";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { LanguageSelect } from "@/components/LanguageSelect";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { playSpeech, useRecorder } from "@/lib/audio";
import { makeId, useFavorites, useHistory } from "@/lib/localStore";
import { translateText } from "@/lib/translate.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Traductor Mandinka de Senegal ↔ Español" },
      {
        name: "description",
        content:
          "Traductor y diccionario especializado en mandinka de Senegal y español, con pronunciación para hispanohablantes y nivel de confianza en cada traducción.",
      },
      { property: "og:title", content: "Traductor Mandinka de Senegal ↔ Español" },
      {
        property: "og:description",
        content: "Traduce, escucha y aprende mandinka de Senegal sin inventar traducciones.",
      },
    ],
  }),
  component: TranslatorPage,
});

type Result = Awaited<ReturnType<typeof translateText>>;

function TranslatorPage() {
  const [sourceLang, setSourceLang] = useState("es");
  const [targetLang, setTargetLang] = useState("mnk-sn");
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [adding, setAdding] = useState(false);
  const history = useHistory();
  const favorites = useFavorites();

  const recorder = useRecorder(
    (transcribed) => setText(transcribed),
    (message) => toast.error(message),
  );

  const mutation = useMutation({
    mutationFn: () => translateText({ data: { text: text.trim(), sourceLang, targetLang, allowAi: true } }),
    onSuccess: (data) => {
      setResult(data);
      if (data.translation) {
        history.add({
          id: makeId(),
          date: new Date().toISOString(),
          input: data.input,
          output: data.translation,
          pronunciation: data.pronunciation,
          direction: `${sourceLang}>${targetLang}`,
          sourceLang,
          targetLang,
          confidence: data.confidence,
        });
      }
    },
    onError: (error: Error) => toast.error(error.message || "No se pudo traducir"),
  });

  return (
    <AppShell>
      <h1 className="sr-only">Traductor Mandinka de Senegal ↔ Español</h1>

      <PhraseOfTheDay />

      <div className="rounded-3xl bg-hero-gradient p-5 text-primary-foreground shadow-soft">
        <p className="text-xs uppercase tracking-widest opacity-80">Traductor especializado</p>
        <p className="mt-1 text-lg font-semibold">Mandinka de Senegal 🇸🇳 ↔ Español 🇪🇸</p>
        <p className="mt-2 text-sm opacity-90">
          Nunca inventamos una traducción: cada resultado indica su nivel de confianza y su fuente.
        </p>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl border border-border bg-card p-2">
        <LanguageSelect
          label="Idioma de origen"
          value={sourceLang}
          exclude={targetLang}
          onChange={(code) => {
            setSourceLang(code);
            setResult(null);
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Invertir idiomas"
          onClick={() => {
            setSourceLang(targetLang);
            setTargetLang(sourceLang);
            setResult(null);
          }}
        >
          <ArrowLeftRight className="size-5" />
        </Button>
        <LanguageSelect
          label="Idioma de destino"
          value={targetLang}
          exclude={sourceLang}
          onChange={(code) => {
            setTargetLang(code);
            setResult(null);
          }}
        />
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe o habla..."
        maxLength={1200}
        className="mt-4 min-h-36 rounded-2xl bg-card text-base"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant={recorder.recording ? "destructive" : "secondary"}
          onClick={() => (recorder.recording ? recorder.stop() : recorder.start())}
          disabled={recorder.busy}
        >
          {recorder.busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : recorder.recording ? (
            <Square className="size-4 animate-pulse" />
          ) : (
            <Mic className="size-4" />
          )}
          {recorder.recording ? "Detener" : "Hablar"}
        </Button>
        <Button
          variant="secondary"
          disabled={!result?.translation}
          onClick={() => {
            playSpeech({
              text: result?.translation ?? "",
              languageCode: targetLang,
              pronunciation: result?.pronunciation ?? null,
            }).catch(() => toast.error("No se pudo reproducir el audio"));
          }}
        >
          <Volume2 className="size-4" /> Escuchar
        </Button>
        <Button
          variant="secondary"
          disabled={!result?.translation}
          onClick={() => {
            void navigator.clipboard.writeText(result?.translation ?? "");
            toast.success("Copiado");
          }}
        >
          <Copy className="size-4" /> Copiar
        </Button>
        <Button
          variant="secondary"
          disabled={!result?.translation}
          onClick={() => {
            if (!result?.translation) return;
            favorites.add({
              id: makeId(),
              kind: "traduccion",
              date: new Date().toISOString(),
              input: result.input,
              output: result.translation,
              pronunciation: result.pronunciation,
              direction: `${sourceLang}>${targetLang}`,
              sourceLang,
              targetLang,
              confidence: result.confidence,
            });
            toast.success("Guardado en favoritos");
          }}
        >
          <Star className="size-4" /> Guardar
        </Button>
      </div>

      <Button
        className="mt-4 h-14 w-full rounded-2xl text-base font-semibold"
        disabled={!text.trim() || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? <Loader2 className="size-5 animate-spin" /> : null} TRADUCIR
      </Button>

      {result ? (
        <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Traducción</h2>
            <ConfidenceBadge level={result.confidence} />
          </div>

          {result.translation ? (
            <>
              <p className="mt-2 text-2xl font-semibold">{result.translation}</p>
              {result.pronunciation ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Pronunciación: <span className="font-medium text-foreground">{result.pronunciation}</span>
                </p>
              ) : null}
              {result.confidence === "unverified" ? (
                <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                  ⚠️ No tenemos una traducción suficientemente verificada. Esta es una posible traducción
                  generada por IA y <strong>NO VERIFICADA</strong>.
                </p>
              ) : null}
              {result.notes ? <p className="mt-2 text-sm text-muted-foreground">{result.notes}</p> : null}
              {result.source ? (
                <p className="mt-2 text-xs text-muted-foreground">Fuente: {result.source}</p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 rounded-xl bg-muted p-3 text-sm">
              ⚠️ No tenemos una traducción suficientemente verificada para esta expresión.
            </p>
          )}

          <CommunityPanel
            sourceText={result.input}
            sourceLang={sourceLang}
            targetLang={targetLang}
            fallback={{
              translation: result.translation ?? "",
              pronunciation: result.pronunciation,
              notes: result.notes,
            }}
          />

          {result.alternatives.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold">Palabras reconocidas</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {result.alternatives.map((alt) => (
                  <li key={`${alt.text}-${alt.note ?? ""}`}>
                    {alt.text} {alt.note ? <span className="opacity-70">· {alt.note}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-4">
        <Button variant="secondary" className="w-full rounded-2xl" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Añadir traducción
        </Button>
      </div>

      <TranslationEditorDialog
        open={adding}
        onOpenChange={setAdding}
        mode="new"
        initial={{
          sourceText: text.trim(),
          sourceLang,
          targetLang,
          translation: result?.translation ?? "",
          pronunciation: result?.pronunciation ?? "",
          notes: "",
        }}
      />

      {history.items.length > 0 ? (
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Historial reciente</h2>
            <Button variant="ghost" size="sm" onClick={history.clear}>
              Borrar todo
            </Button>
          </div>
          <ul className="mt-2 space-y-2">
            {history.items.slice(0, 8).map((item) => (
              <li key={item.id} className="rounded-2xl border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">
                  {new Date(item.date).toLocaleString("es-ES")} ·{" "}
                  {(item.sourceLang ?? "es").toUpperCase()} → {(item.targetLang ?? "mnk-sn").toUpperCase()}
                </p>
                <p className="text-sm">{item.input}</p>
                <p className="font-medium">{item.output}</p>
                {item.pronunciation ? (
                  <p className="text-xs text-muted-foreground">{item.pronunciation}</p>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      playSpeech({
                        text: item.output,
                        languageCode: item.targetLang ?? null,
                        pronunciation: item.pronunciation,
                      }).catch(() => toast.error("No se pudo reproducir"));
                    }}
                  >
                    <Volume2 className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      favorites.add({ ...item, id: makeId(), kind: "traduccion" });
                      toast.success("Guardado en favoritos");
                    }}
                  >
                    <Star className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => history.remove(item.id)}>
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}