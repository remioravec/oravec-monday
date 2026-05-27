"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Assignee {
  id: string;
  color: string;
  display_name: string;
}

export function TaskItem({
  id,
  title,
  status,
  batteryCost,
  priority,
  assignees,
}: {
  id: string;
  title: string;
  status: string;
  batteryCost: number;
  priority: string;
  assignees: Assignee[];
}) {
  const router = useRouter();
  const [done, setDone] = useState(status === "done");
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const next = done ? "todo" : "done";
    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update({ status: next })
      .eq("id", id);
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(!done);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2">
      <input
        type="checkbox"
        checked={done}
        onChange={toggle}
        disabled={pending}
        className="size-5 accent-primary"
        aria-label={`Valider ${title}`}
      />
      <span className={cn("flex-1 text-sm", done && "text-muted-foreground line-through")}>
        {title}
      </span>
      {priority === "high" && (
        <span className="text-xs font-medium text-battery-danger">●</span>
      )}
      {batteryCost > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {batteryCost}%
        </span>
      )}
      <div className="flex -space-x-1.5">
        {assignees.map((a) => (
          <span
            key={a.id}
            title={a.display_name}
            className="size-5 rounded-full ring-2 ring-card"
            style={{ backgroundColor: a.color }}
          />
        ))}
      </div>
    </div>
  );
}
