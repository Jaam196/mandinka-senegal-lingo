import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; className: string }> = {
  verified: { label: "✅ Confirmada", className: "bg-accent/15 text-accent" },
  probable: { label: "🟡 Probable", className: "bg-gold/25 text-gold-foreground" },
  high_confidence: { label: "👥 Comunidad", className: "bg-accent/15 text-accent" },
  approximate: { label: "⚠️ Aproximada", className: "bg-primary/15 text-primary" },
  unverified: { label: "🤖 IA · NO VERIFICADA", className: "bg-destructive/15 text-destructive" },
  none: { label: "❌ Sin traducción fiable", className: "bg-muted text-muted-foreground" },
};

export function ConfidenceBadge({ level, className }: { level: string; className?: string }) {
  const item = MAP[level] ?? MAP["none"]!;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        item.className,
        className,
      )}
    >
      {item.label}
    </span>
  );
}