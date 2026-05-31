"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useProjects, useProfiles } from "@/lib/queries";
import { AddTaskDialog } from "@/components/overview/add-task-dialog";

/**
 * Bouton flottant (sticky, bas-droite) présent sur toutes les pages de l'app
 * pour créer une tâche rapidement. Au-dessus de la barre de navigation basse
 * sur mobile, coin inférieur droit sur desktop.
 */
export function AddTaskFab() {
  const [open, setOpen] = useState(false);
  const { data: projects = [] } = useProjects();
  const { data: profiles = [] } = useProfiles();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ajouter une tâche"
        title="Ajouter une tâche"
        className="fixed bottom-20 right-4 z-40 grid size-14 place-items-center rounded-full bg-primary text-white shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl active:scale-95 md:bottom-6 md:right-6"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <Plus className="size-6" />
      </button>

      {open && (
        <AddTaskDialog
          projects={projects.map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color ?? "#94a3b8",
          }))}
          profiles={profiles}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
