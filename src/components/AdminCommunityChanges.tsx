import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { countVotes, formatDate, useCommunityChanges, useRevertVersion } from "@/lib/community";

export function AdminCommunityChanges() {
  const changes = useCommunityChanges(150);
  const revert = useRevertVersion();
  const [target, setTarget] = useState<string | null>(null);

  const list = changes.data ?? [];
  const previousOf = (translationId: string, versionNumber: number) =>
    list.find((v) => v.translation_id === translationId && v.version_number === versionNumber - 1) ?? null;

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-semibold">📜 Cambios de la comunidad</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Historial completo de versiones. Solo la administración puede revertir.
      </p>

      {changes.isLoading ? <Loader2 className="mt-4 size-5 animate-spin text-muted-foreground" /> : null}
      {!changes.isLoading && list.length === 0 ? (
        <p className="mt-3 rounded-xl bg-muted p-3 text-sm">Todavía no hay cambios de la comunidad.</p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {list.map((v) => {
          const votes = countVotes(v);
          const prev = previousOf(v.translation_id, v.version_number);
          const isCurrent = v.community_translations?.current_version_id === v.id;
          return (
            <li key={v.id} className="rounded-xl bg-secondary/40 p-3 text-sm">
              <p className="text-xs text-muted-foreground">
                {formatDate(v.created_at)} · {v.community_translations?.source_lang} →{" "}
                {v.community_translations?.target_lang} · versión {v.version_number}
                {isCurrent ? " · actual" : ""}
                {v.change_type === "revert" ? " · reversión" : ""}
              </p>
              <p className="font-semibold">{v.source_text}</p>
              {prev ? (
                <>
                  <p className="text-muted-foreground line-through">
                    {prev.translation} · {prev.pronunciation || "—"}
                  </p>
                  <p>
                    {v.translation} · {v.pronunciation || "—"}
                  </p>
                </>
              ) : (
                <p>
                  {v.translation} · {v.pronunciation || "—"}
                </p>
              )}
              {v.notes ? <p className="text-muted-foreground">Notas: {v.notes}</p> : null}
              <p className="mt-1 text-xs text-muted-foreground">
                Por {v.display_name || "Anónimo"} ({v.device_id?.slice(0, 8)}) · 👍 {votes.up} / 👎{" "}
                {votes.down}
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-2"
                disabled={revert.isPending}
                onClick={() => setTarget(v.id)}
              >
                <RotateCcw className="size-4" /> Revertir esta versión
              </Button>
            </li>
          );
        })}
      </ul>

      <AlertDialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revertir a esta versión?</AlertDialogTitle>
            <AlertDialogDescription>
              Se restaurarán estos datos como versión actual para todos los usuarios y se registrará una
              nueva versión de tipo reversión. No se elimina ninguna versión anterior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!target) return;
                revert.mutate(target, {
                  onSuccess: () => toast.success("Versión revertida"),
                  onError: (e: Error) => toast.error(e.message),
                });
                setTarget(null);
              }}
            >
              Revertir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
