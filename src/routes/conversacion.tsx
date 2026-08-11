import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Mic, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { LanguageSelect } from "@/components/LanguageSelect";
import { Button } from "@/components/ui/button";
import { playSpeech, useRecorder } from "@/lib/audio";
import { makeId, useHistory } from "@/lib/localStore";
import { translateText } from "@/lib/translate.functions";

export const Route = createFileRoute("/conversacion")({
  head: () => ({
    meta: [
      { title: "Modo conversación Mandinka ↔ Español" },
      {
        name: "description",
        content:
          "Habla y traduce en tiempo real entre español y mandinka de Senegal, con transcripción, pronunciación y audio.",
      },
      { property: "og:title", content: "Modo conversación Mandinka ↔ Español" },
      {
        property: "og:description",
        content: "Conversación bidireccional por voz entre español y mandinka de Senegal.",
      },
    ],
  }),
  component: ConversationPage,
});

type Turn = {
  id: string;
  sourceLang: string;
  targetLang: string;
  original: string;
  translation: string | null;
  pronunciation: string | null;
  confidence: string;
};

function shortLabel(code: string) {
  return code.toUpperCase();
}

function ConversationPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [langA, setLangA] = useState("es");
  const [langB, setLangB] = useState("mnk-sn");
  const [activeSide, setActiveSide] = useState<"a" | "b">("a");
  const [pending, setPending] = useState(false);
  const history = useHistory();

  async function handleText(text: string, sourceLang: string, targetLang: string) {
    setPending(true);
    try {
      const result = await translateText({ data: { text, sourceLang, targetLang, allowAi: true } });
      const turn: Turn = {
        id: makeId(),
        sourceLang,
        targetLang,
        original: text,
        translation: result.translation,
        pronunciation: result.pronunciation,
        confidence: result.confidence,
      };
      setTurns((t) => [...t, turn]);
      if (result.translation) {
        history.add({
          id: makeId(),
          date: new Date().toISOString(),
          input: text,
          output: result.translation,
          pronunciation: result.pronunciation,
          direction: `${sourceLang}>${targetLang}`,
          sourceLang,
          targetLang,
          confidence: result.confidence,
        });
        void playSpeech({
          text: result.translation,
          languageCode: targetLang,
          pronunciation: result.pronunciation,
        }).catch(() => undefined);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo traducir");
    } finally {
      setPending(false);
    }
  }

  const recorder = useRecorder(
    (text) =>
      void handleText(text, activeSide === "a" ? langA : langB, activeSide === "a" ? langB : langA),
    (message) => toast.error(message),
  );

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">🗣️ Conversación</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Elige quién habla, mantén la grabación y suelta para traducir.
      </p>

      <div className="mt-4 flex gap-3">
        <LanguageSelect label="Idioma A" value={langA} exclude={langB} onChange={setLangA} />
        <LanguageSelect label="Idioma B" value={langB} exclude={langA} onChange={setLangB} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {(["a", "b"] as const).map((side) => (
          <Button
            key={side}
            variant={activeSide === side ? "default" : "secondary"}
            className="h-14 rounded-2xl text-base"
            onClick={() => setActiveSide(side)}
          >
            Habla {shortLabel(side === "a" ? langA : langB)}
          </Button>
        ))}
      </div>

      <Button
        className="mt-4 h-20 w-full rounded-3xl text-lg font-semibold"
        variant={recorder.recording ? "destructive" : "default"}
        disabled={recorder.busy || pending}
        onClick={() => (recorder.recording ? recorder.stop() : recorder.start())}
      >
        {recorder.busy || pending ? (
          <Loader2 className="size-6 animate-spin" />
        ) : recorder.recording ? (
          <Square className="size-6 animate-pulse" />
        ) : (
          <Mic className="size-6" />
        )}
        {recorder.recording ? "Escuchando... toca para parar" : "Mantener conversación"}
      </Button>

      <ul className="mt-6 space-y-3">
        {turns.map((turn) => (
          <li key={turn.id} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              👤 {shortLabel(turn.sourceLang)}
            </p>
            <p className="text-sm">{turn.original}</p>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  🤖 {shortLabel(turn.targetLang)}
                </p>
                <p className="text-lg font-semibold">
                  {turn.translation ?? "⚠️ Sin traducción verificada"}
                </p>
                {turn.pronunciation ? (
                  <p className="text-sm text-muted-foreground">🔊 {turn.pronunciation}</p>
                ) : null}
              </div>
              <ConfidenceBadge level={turn.confidence} />
            </div>
            {turn.translation ? (
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => {
                  playSpeech({
                    text: turn.translation ?? "",
                    languageCode: turn.targetLang,
                    pronunciation: turn.pronunciation,
                  }).catch(() => toast.error("No se pudo reproducir"));
                }}
              >
                <Volume2 className="size-4" /> Escuchar
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      {turns.length > 0 ? (
        <Button variant="ghost" className="mt-4" onClick={() => setTurns([])}>
          Vaciar conversación
        </Button>
      ) : null}
    </AppShell>
  );
}