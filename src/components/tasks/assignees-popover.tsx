"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import type { Profile } from "@/lib/queries";

export function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AssigneeAvatar({
  profile,
  size = "sm",
}: {
  profile: Pick<Profile, "id" | "full_name" | "color">;
  size?: "sm" | "default";
}) {
  return (
    <Avatar
      size={size}
      title={profile.full_name ?? "Sans nom"}
      style={{ backgroundColor: profile.color }}
    >
      <AvatarFallback
        className="text-white"
        style={{ backgroundColor: profile.color }}
      >
        {getInitials(profile.full_name)}
      </AvatarFallback>
    </Avatar>
  );
}

export function AssigneesStack({
  assigneeIds,
  profiles,
  max = 3,
}: {
  assigneeIds: string[];
  profiles: Profile[];
  max?: number;
}) {
  const assigned = profiles.filter((p) => assigneeIds.includes(p.id));
  if (assigned.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const visible = assigned.slice(0, max);
  const remaining = assigned.length - visible.length;
  return (
    <AvatarGroup>
      {visible.map((p) => (
        <AssigneeAvatar key={p.id} profile={p} />
      ))}
      {remaining > 0 && (
        <AvatarGroupCount className="size-6 text-[0.65rem]">
          +{remaining}
        </AvatarGroupCount>
      )}
    </AvatarGroup>
  );
}

export function AssigneesPopover({
  assigneeIds,
  profiles,
  onToggle,
  trigger,
}: {
  assigneeIds: string[];
  profiles: Profile[];
  onToggle: (userId: string, assign: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const filtered = profiles.filter((p) =>
    (p.full_name ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <button
              type="button"
              aria-label="Modifier les assignés"
              className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-muted"
            >
              {assigneeIds.length === 0 ? (
                <span className="grid size-6 place-items-center rounded-full border border-dashed text-muted-foreground">
                  <Plus className="size-3" />
                </span>
              ) : (
                <AssigneesStack assigneeIds={assigneeIds} profiles={profiles} />
              )}
            </button>
          )
        }
      />
      <DropdownMenuContent align="start" className="w-56 p-2">
        <Input
          placeholder="Rechercher…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-2"
        />
        <div className="flex max-h-60 flex-col gap-0.5 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-2 py-1 text-xs text-muted-foreground">
              Aucun profil.
            </div>
          ) : (
            filtered.map((p) => {
              const on = assigneeIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onToggle(p.id, !on)}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent"
                >
                  <AssigneeAvatar profile={p} />
                  <span className="flex-1 truncate">
                    {p.full_name ?? "Sans nom"}
                  </span>
                  {on && <Check className="size-4 text-primary" />}
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
