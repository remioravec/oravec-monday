"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Database } from "@/lib/supabase/database.types";

type Workload = Database["public"]["Views"]["person_workload"]["Row"];

const STATUS_COLORS = {
  a_faire: "var(--status-todo)",
  en_cours: "var(--status-doing)",
  fait: "var(--status-done)",
} as const;

export function WorkloadCard({
  row,
  avatarUrl,
}: {
  row: Workload;
  avatarUrl?: string | null;
}) {
  const total = Math.max(row.total ?? 0, 0);
  const a = row.a_faire ?? 0;
  const c = row.en_cours ?? 0;
  const d = row.fait ?? 0;
  const pct = total > 0 ? Math.round((d / total) * 100) : 0;

  const segments =
    total > 0
      ? [
          { key: "a_faire", value: a, color: STATUS_COLORS.a_faire },
          { key: "en_cours", value: c, color: STATUS_COLORS.en_cours },
          { key: "fait", value: d, color: STATUS_COLORS.fait },
        ]
      : [];

  const name = row.full_name?.trim() || "Sans nom";
  const initials = name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar className="size-10" style={{ backgroundColor: row.color }}>
          {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
          <AvatarFallback
            className="text-white"
            style={{ backgroundColor: row.color }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">
            {total === 0 ? "Aucune tâche" : `${total} tâches au total`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tabular-nums">{pct}%</div>
          <div className="text-xs text-muted-foreground">fait</div>
        </div>
      </div>

      {total > 0 ? (
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {segments.map((s) =>
            s.value === 0 ? null : (
              <div
                key={s.key}
                className="h-full"
                style={{
                  width: `${(s.value / total) * 100}%`,
                  backgroundColor: s.color,
                }}
                title={`${s.key}: ${s.value}`}
              />
            ),
          )}
        </div>
      ) : (
        <div className="h-3 w-full rounded-full bg-muted" />
      )}

      <div className="flex flex-wrap gap-3 text-xs">
        <Legend dot={STATUS_COLORS.a_faire} label={`${a} à faire`} />
        <Legend dot={STATUS_COLORS.en_cours} label={`${c} en cours`} />
        <Legend dot={STATUS_COLORS.fait} label={`${d} fait`} />
      </div>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{ backgroundColor: dot }}
      />
      {label}
    </div>
  );
}
