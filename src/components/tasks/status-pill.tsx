"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { TaskStatus } from "@/lib/supabase/database.types";

const STATUS_LABELS: Record<TaskStatus, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  fait: "Fait",
};

const STATUS_BG: Record<TaskStatus, string> = {
  a_faire: "#9ca3af",
  en_cours: "#f59e0b",
  fait: "#22c55e",
};

export function statusLabel(s: TaskStatus) {
  return STATUS_LABELS[s];
}
export function statusColor(s: TaskStatus) {
  return STATUS_BG[s];
}

export function StatusPill({
  status,
  onChange,
  size = "default",
}: {
  status: TaskStatus;
  onChange: (next: TaskStatus) => void;
  size?: "default" | "sm";
}) {
  const sizeClass =
    size === "sm" ? "h-6 px-2 text-[0.7rem]" : "h-7 px-2.5 text-xs";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded-full font-medium text-white shadow-sm ${sizeClass}`}
            style={{ backgroundColor: STATUS_BG[status] }}
            aria-label={`Statut : ${STATUS_LABELS[status]}`}
          />
        }
      >
        <span>{STATUS_LABELS[status]}</span>
        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => onChange(s)}
            className="gap-2"
          >
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: STATUS_BG[s] }}
            />
            {STATUS_LABELS[s]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
