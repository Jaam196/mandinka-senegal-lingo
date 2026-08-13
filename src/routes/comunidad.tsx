import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/comunidad")({
  head: () => ({
    meta: [
      { title: "Comunidad de colaboradores del diccionario" },
      {
        name: "description",
        content:
          "Personas que aportan traducciones, pronunciaciones y confirmaciones al diccionario colaborativo de lenguas de África Occidental.",
      },
      { property: "og:title", content: "Comunidad de colaboradores" },
      {
        property: "og:description",
        content: "Aportaciones recientes y ranking de colaboradores del diccionario colaborativo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommunityPage,
});

type VersionRow = {
  id: string;
  display_name: string | null;
  source_text: string;
  translation: string;
  change_type: string;
  created_at: string;
};

function useContributions() {
  return useQuery({
    queryKey: ["community-contributions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("translation_versions")
        .select("id,display_name,source_text,translation,change_type,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as VersionRow[];
    },
  });
}

export function CommunityPage() {
  const contributions = useContributions();
  const rows = contributions.data ?? [];

  const ranking = Object.entries(
    rows.reduce<Record<string, number>>((acc, r) => {
      const name = (r.display_name || "Anónimo").trim() || "Anónimo";
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">🤝 Comunidad</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada aportación mejora el diccionario para todas las personas que usan la aplicación.
      </p>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Trophy className="size-4 text-primary" /> Colaboradores
        </h2>
        {ranking.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Todavía no hay aportaciones registradas.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {ranking.slice(0, 20).map(([name, count], i) => (
              <li key={name} className="flex items-center justify-between text-sm">
                <span>
                  {i + 1}. {name}
                </span>
                <span className="text-muted-foreground">{count} aportaciones</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold">Últimos cambios</h2>
        <ul className="mt-3 space-y-3">
          {rows.slice(0, 30).map((r) => (
            <li key={r.id} className="rounded-xl bg-secondary/60 p-3 text-sm">
              <p className="font-medium">
                {r.source_text} → {r.translation}
              </p>
              <p className="text-xs text-muted-foreground">
                {r.display_name || "Anónimo"} ·{" "}
                {new Date(r.created_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })} ·{" "}
                {r.change_type === "revert" ? "reversión" : r.change_type === "create" ? "nueva" : "corrección"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
