"use client";

import { ArrowDownAZ, Filter, LayoutGrid, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Profile } from "@/lib/queries";

export type GroupBy = "status" | "assignee" | "none";

const GROUP_LABEL: Record<GroupBy, string> = {
  status: "Statut",
  assignee: "Personne",
  none: "Aucun",
};

export function BoardToolbar({
  onAdd,
  search,
  onSearchChange,
  groupBy,
  onGroupByChange,
  assigneeFilter,
  onAssigneeFilterChange,
  profiles,
  extraRight,
}: {
  onAdd: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  assigneeFilter: string[];
  onAssigneeFilterChange: (ids: string[]) => void;
  profiles: Profile[];
  extraRight?: React.ReactNode;
}) {
  const toggle = (id: string) => {
    if (assigneeFilter.includes(id)) {
      onAssigneeFilterChange(assigneeFilter.filter((x) => x !== id));
    } else {
      onAssigneeFilterChange([...assigneeFilter, id]);
    }
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b bg-background px-3 py-2 sm:flex-wrap sm:px-4">
      <Button
        onClick={onAdd}
        className="h-8 shrink-0 rounded-md bg-primary px-3 text-sm font-medium text-white hover:bg-primary/90"
      >
        <Plus className="size-3.5" />
        <span className="hidden sm:inline">Ajouter élément</span>
      </Button>

      <div className="relative ml-1 shrink-0">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher…"
          className="h-8 w-40 rounded-md border border-input bg-background pl-7 pr-7 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 sm:w-48"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted"
            aria-label="Effacer"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-1.5 px-2 text-xs" />
          }
        >
          <Filter className="size-3.5" />
          Personne
          {assigneeFilter.length > 0 && (
            <span className="ml-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
              {assigneeFilter.length}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-52">
          <DropdownMenuLabel>Filtrer par personne</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {profiles.length === 0 && (
            <DropdownMenuItem disabled>Aucun profil</DropdownMenuItem>
          )}
          {profiles.map((p) => {
            const initial =
              (p.full_name ?? "?").trim().charAt(0).toUpperCase() || "?";
            return (
              <DropdownMenuCheckboxItem
                key={p.id}
                checked={assigneeFilter.includes(p.id)}
                onCheckedChange={() => toggle(p.id)}
              >
                <span className="flex items-center gap-2">
                  <Avatar className="size-5">
                    <AvatarFallback
                      className="text-[10px]"
                      style={{ backgroundColor: p.color ?? "#94a3b8" }}
                    >
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  {p.full_name}
                </span>
              </DropdownMenuCheckboxItem>
            );
          })}
          {assigneeFilter.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAssigneeFilterChange([])}>
                Effacer le filtre
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-1.5 px-2 text-xs" />
          }
        >
          <LayoutGrid className="size-3.5" />
          Grouper par <span className="font-medium">{GROUP_LABEL[groupBy]}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {(["status", "assignee", "none"] as GroupBy[]).map((g) => (
            <DropdownMenuItem
              key={g}
              onClick={() => onGroupByChange(g)}
              className={groupBy === g ? "font-medium text-foreground" : ""}
            >
              {GROUP_LABEL[g]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-1.5 px-2 text-xs" disabled>
        <ArrowDownAZ className="size-3.5" />
        Trier
      </Button>

      <div className="ml-auto flex items-center gap-2">{extraRight}</div>
    </div>
  );
}
