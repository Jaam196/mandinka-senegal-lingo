import { useState } from "react";
import { History, Pencil, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { TranslationEditorDialog } from "@/components/TranslationEditorDialog";
import { Button } from "@/components/ui/button";
import {
  countVotes,
  currentVersion,
  formatDate,
  sortedVersions,
  useCommunityTranslation,
  useConfirmVersion,
  type CommunityTranslation,
} from "@/lib/community";

type Props = {
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  /** Valores mostrados actualmente (diccionario o IA) si aún no hay versión comunitaria. */
  fallback: { translation: string; pronunciation?: string | null; notes?: string | null };
  compact?: boolean;
};

export function CommunityPanel({ sourceText, sourceLang, targetLang, fallback, compact }: Props) {
  const query = useCommunityTranslation(sourceText, sourceLang, targetLang);
  const confirm = useConfirmVersion();
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const entry = (query.data ?? null) as CommunityTranslation | null;
  const version = currentVersion(entry);
  const votes = countVotes(version);

  return (
    <div className={compact ? "mt-2" : "mt-4 border-t border-border pt-3"}>
      {entry && version ? (
        <p className="text-xs text-muted-foreground">
          Último cambio por: <strong>{version.display_name || "Anónimo"}</strong> ·{" "}
          {formatDate(version.created_at)} · versión {version.version_number}
          {version.change_type === "revert" ? " (reversión)" : ""}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Sin ediciones de la comunidad todavía.</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {version ? (
          <>
            <Button
              size="sm"
              variant={votes.mine?.confirmed ? "default" : "secondary"}
              disabled={confirm.isPending}
              onClick={() =>
                confirm.mutate(
                  { versionId: version.id, confirmed: true },
                  {
                    onSuccess: () => toast.success("Confirmación registrada"),
                    onError: (e: Error) => toast.error(e.message),
                  },
                )
              }
            >
              <ThumbsUp className="size-4" /> Confirmar ({votes.up})
            </Button>
            <Button
              size="sm"
              variant={votes.mine && !votes.mine.confirmed ? "destructive" : "secondary"}
              disabled={confirm.isPending}
              onClick={() =>
                confirm.mutate(
                  { versionId: version.id, confirmed: false },
                  {
                    onSuccess: () => toast.success("Voto registrado"),
                    onError: (e: Error) => toast.error(e.message),
                  },
                )
              }
            >
              <ThumbsDown className="size-4" /> No estoy de acuerdo ({votes.down})
            </Button>
          </>
        ) : null}

        <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
          <Pencil className="size-4" /> Proponer corrección
        </Button>

        {entry ? (
          <Button size="sm" variant="ghost" onClick={() => setShowHistory((v) => !v)}>
            <History className="size-4" /> Historial ({entry.version_number})
          </Button>
        ) : null}
      </div>

      {version ? (
        <p className="mt-1 text-xs text-muted-foreground">👍 Confirmada por {votes.up} usuarios</p>
      ) : null}

      {showHistory && entry ? (
        <ul className="mt-3 space-y-2">
          {sortedVersions(entry).map((v) => {
            const c = countVotes(v);
            return (
              <li key={v.id} className="rounded-xl bg-secondary/50 p-3 text-sm">
                <p className="font-semibold">
                  Versión {v.version_number}
                  {v.id === entry.current_version_id ? " · actual" : ""}
                  {v.change_type === "revert" ? " · reversión" : ""}
                </p>
                <p>Traducción: {v.translation}</p>
                <p className="text-muted-foreground">Pronunciación: {v.pronunciation || "—"}</p>
                <p className="text-muted-foreground">Notas: {v.notes || "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {v.display_name || "Anónimo"} · {formatDate(v.created_at)} · 👍 {c.up} / 👎 {c.down}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}

      <TranslationEditorDialog
        open={editing}
        onOpenChange={setEditing}
        mode="edit"
        initial={{
          sourceText,
          sourceLang,
          targetLang,
          translation: entry?.translation ?? fallback.translation ?? "",
          pronunciation: entry?.pronunciation ?? fallback.pronunciation ?? "",
          notes: entry?.notes ?? fallback.notes ?? "",
        }}
      />
    </div>
  );
}
