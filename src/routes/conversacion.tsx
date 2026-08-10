import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Mic, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { Button } from "@/components/ui/button";
import { playSpeech, speechFor, useRecorder } from "@/lib/audio";
import { makeId, useHistory, type Direction } from "@/lib/localStore";
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
  direction: Direction;
  original: string;
  translation: string | null;
  pronunciation: string | null;
  confidence: string;
};

function ConversationPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [active, setActive] = useState<Direction>("es-mnk");
  const [pending, setPending] = useState(false);
  const history = useHistory();

  async function handleText(text: string, direction: Direction) {
    setPending(true);
    try {
      const result = await translateText({ data: { text, direction, allowAi: true } });
      const turn: Turn = {
        id: makeId(),
        direction,
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
          direction,
          confidence: result.confidence,
        });
        const s = speechFor(direction, result.translation, result.pronunciation);
        void playSpeech(s.text, s.style).catch(() => undefined);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo traducir");
    } finally {
      setPending(false);
    }
  }

  const recorder = useRecorder(
    (text) => void handleText(text, active),
    (message) => toast.error(message),
  );

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">🗣️ Conversación</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Elige quién habla, mantén la grabación y suelta para traducir.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {(["es-mnk", "mnk-es"] as Direction[]).map((dir) => (
          <Button
            key={dir}
            variant={active === dir ? "default" : "secondary"}
            className="h-14 rounded-2xl text-base"
            onClick={() => setActive(dir)}
          >
            {dir === "es-mnk" ? "🇪🇸 Español" : "🇸🇳 Mandinka"}
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
              👤 {turn.direction === "es-mnk" ? "Español" : "Mandinka"}
            </p>
            <p className="text-sm">{turn.original}</p>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  🤖 {turn.direction === "es-mnk" ? "Mandinka" : "Español"}
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
                  const s = speechFor(turn.direction, turn.translation, turn.pronunciation);
                  playSpeech(s.text, s.style).catch(() => toast.error("No se pudo reproducir"));
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