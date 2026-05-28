"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  GripVertical,
  MoreHorizontal,
  Folder as FolderIcon,
  LayoutGrid,
  LogOut,
  Trash2,
  Pencil,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  useFolders,
  useProjects,
  useCreateFolder,
  useCreateProject,
  useUpdateFolder,
  useUpdateProject,
  useDeleteFolder,
  useDeleteProject,
  useReorderFolders,
  useReorderProjects,
  useSignOut,
} from "@/lib/queries";

type Folder = ReturnType<typeof useFolders>["data"] extends (infer T)[] | undefined
  ? T
  : never;
type Project = ReturnType<typeof useProjects>["data"] extends (infer T)[] | undefined
  ? T
  : never;

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: folders = [] } = useFolders();
  const { data: projects = [] } = useProjects();
  const reorderFolders = useReorderFolders();
  const reorderProjects = useReorderProjects();
  const createFolder = useCreateFolder();
  const signOut = useSignOut();

  // Expand/collapse override map (undefined = open by default).
  const [foldersCollapsed, setFoldersCollapsed] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => foldersCollapsed[id] !== true;

  const projectsByFolder = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const f of folders) map.set(f.id, []);
    const orphan: Project[] = [];
    for (const p of projects) {
      if (p.folder_id && map.has(p.folder_id)) {
        map.get(p.folder_id)!.push(p);
      } else {
        orphan.push(p);
      }
    }
    return { map, orphan };
  }, [folders, projects]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const folderIds = folders.map((f) => f.id);

  function handleFolderDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = folderIds.indexOf(String(active.id));
    const newIdx = folderIds.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(folders, oldIdx, newIdx);
    reorderFolders.mutate(
      next.map((f, i) => ({ id: f.id, position: i })),
      { onError: () => toast.error("Réordonnancement impossible") },
    );
  }

  async function handleAddFolder() {
    const name = window.prompt("Nom du dossier ?");
    if (!name?.trim()) return;
    await createFolder.mutateAsync(
      { name: name.trim(), position: folders.length },
      { onError: (e) => toast.error(e.message) },
    );
  }

  async function handleSignOut() {
    await signOut.mutateAsync();
    window.location.href = "/login";
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
          <LayoutGrid className="size-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Oravec Monday</div>
        </div>
      </div>

      {/* Nav top-level */}
      <nav className="flex flex-col gap-0.5 px-2 py-3">
        <Link
          href="/app"
          onClick={onNavigate}
          className={navLinkClass(pathname === "/app")}
        >
          <LayoutGrid className="size-4" />
          Vue d&apos;ensemble
        </Link>
      </nav>

      {/* Folders */}
      <div className="flex items-center justify-between px-4 pt-2 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        <span>Dossiers</span>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={handleAddFolder}
          aria-label="Ajouter un dossier"
        >
          <Plus />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pb-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleFolderDragEnd}
        >
          <SortableContext items={folderIds} strategy={verticalListSortingStrategy}>
            {folders.map((folder) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                open={isOpen(folder.id)}
                onToggleOpen={() =>
                  setFoldersCollapsed((s) => ({
                    ...s,
                    [folder.id]: !(s[folder.id] === true),
                  }))
                }
                projects={projectsByFolder.map.get(folder.id) ?? []}
                folders={folders}
                onProjectsReorder={(items) =>
                  reorderProjects.mutate(
                    items.map((p, i) => ({
                      id: p.id,
                      position: i,
                      folder_id: folder.id,
                    })),
                  )
                }
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </SortableContext>
        </DndContext>

        {projectsByFolder.orphan.length > 0 && (
          <div className="mt-3 px-2 text-xs text-muted-foreground">
            <div className="px-2 py-1 font-medium">Hors dossier</div>
            {projectsByFolder.orphan.map((p) => (
              <ProjectLink
                key={p.id}
                project={p}
                folders={folders}
                active={pathname === `/app/projects/${p.id}`}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-2 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="size-4" />
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}

function navLinkClass(active: boolean) {
  return [
    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
      : "text-sidebar-foreground hover:bg-sidebar-accent/60",
  ].join(" ");
}

// ============================================================================
// FolderRow
// ============================================================================
function FolderRow({
  folder,
  open,
  onToggleOpen,
  projects,
  folders,
  onProjectsReorder,
  pathname,
  onNavigate,
}: {
  folder: Folder;
  open: boolean;
  onToggleOpen: () => void;
  projects: Project[];
  folders: Folder[];
  onProjectsReorder: (items: Project[]) => void;
  pathname: string;
  onNavigate?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: folder.id });
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(folder.name);
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const createProject = useCreateProject();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const projectIds = projects.map((p) => p.id);
  function handleProjectsDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = projectIds.indexOf(String(active.id));
    const newIdx = projectIds.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    onProjectsReorder(arrayMove(projects, oldIdx, newIdx));
  }

  async function handleRename() {
    if (!name.trim() || name === folder.name) {
      setRenaming(false);
      setName(folder.name);
      return;
    }
    await updateFolder.mutateAsync({ id: folder.id, name: name.trim() });
    setRenaming(false);
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer le dossier "${folder.name}" ?`)) return;
    await deleteFolder.mutateAsync(folder.id, {
      onError: (e) => toast.error(e.message),
    });
  }

  async function handleAddProject() {
    const projName = window.prompt("Nom du projet ?");
    if (!projName?.trim()) return;
    await createProject.mutateAsync(
      {
        name: projName.trim(),
        folder_id: folder.id,
        position: projects.length,
      },
      { onError: (e) => toast.error(e.message) },
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="mb-0.5">
      <div className="group flex items-center gap-0.5 rounded-md px-1 py-1 hover:bg-sidebar-accent/40">
        <button
          type="button"
          className="cursor-grab touch-none p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Réordonner le dossier"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={onToggleOpen}
          className="grid size-5 place-items-center text-muted-foreground"
          aria-label={open ? "Replier" : "Déplier"}
        >
          {open ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>
        <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
        {renaming ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") {
                setName(folder.name);
                setRenaming(false);
              }
            }}
            className="h-6 flex-1 px-1.5 text-sm"
          />
        ) : (
          <button
            type="button"
            onClick={onToggleOpen}
            className="flex-1 truncate text-left text-sm font-medium"
          >
            {folder.name}
          </button>
        )}
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={handleAddProject}
          aria-label="Ajouter un projet"
          className="opacity-0 group-hover:opacity-100"
        >
          <Plus />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                size="icon-xs"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100"
                aria-label="Plus"
              />
            }
          >
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setRenaming(true)}>
              <Pencil className="size-3.5" />
              Renommer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 className="size-3.5" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {open && (
        <div className="ml-5 mt-0.5 border-l pl-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleProjectsDragEnd}
          >
            <SortableContext items={projectIds} strategy={verticalListSortingStrategy}>
              {projects.map((p) => (
                <SortableProjectRow
                  key={p.id}
                  project={p}
                  folders={folders}
                  active={pathname === `/app/projects/${p.id}`}
                  onNavigate={onNavigate}
                />
              ))}
            </SortableContext>
          </DndContext>
          {projects.length === 0 && (
            <div className="px-2 py-1 text-xs text-muted-foreground italic">
              Aucun projet.{" "}
              <button
                type="button"
                className="underline hover:text-foreground"
                onClick={handleAddProject}
              >
                Ajouter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ProjectRow
// ============================================================================
function SortableProjectRow({
  project,
  folders,
  active,
  onNavigate,
}: {
  project: Project;
  folders: Folder[];
  active: boolean;
  onNavigate?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group flex items-center gap-0.5">
      <button
        type="button"
        className="cursor-grab touch-none p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Réordonner le projet"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3 text-muted-foreground" />
      </button>
      <ProjectLink
        project={project}
        folders={folders}
        active={active}
        onNavigate={onNavigate}
      />
    </div>
  );
}

function ProjectLink({
  project,
  folders,
  active,
  onNavigate,
}: {
  project: Project;
  folders: Folder[];
  active: boolean;
  onNavigate?: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(project.name);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  async function handleRename() {
    if (!name.trim() || name === project.name) {
      setRenaming(false);
      setName(project.name);
      return;
    }
    await updateProject.mutateAsync({ id: project.id, name: name.trim() });
    setRenaming(false);
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer le projet "${project.name}" ?`)) return;
    await deleteProject.mutateAsync(project.id, {
      onError: (e) => toast.error(e.message),
    });
  }

  function handleMoveTo(folder_id: string | null) {
    updateProject.mutate({ id: project.id, folder_id, position: 0 });
  }

  return (
    <div
      className={[
        "flex flex-1 items-center gap-1 rounded-md px-2 py-1 transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "hover:bg-sidebar-accent/60",
      ].join(" ")}
    >
      {renaming ? (
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") {
              setName(project.name);
              setRenaming(false);
            }
          }}
          className="h-6 flex-1 px-1.5 text-sm"
        />
      ) : (
        <Link
          href={`/app/projects/${project.id}`}
          onClick={onNavigate}
          className="flex-1 truncate text-sm"
        >
          {project.name}
        </Link>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon-xs"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100"
              aria-label="Plus"
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setRenaming(true)}>
            <Pencil className="size-3.5" />
            Renommer
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ArrowRightLeft className="size-3.5" />
              Déplacer vers
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {folders
                .filter((f) => f.id !== project.folder_id)
                .map((f) => (
                  <DropdownMenuItem key={f.id} onClick={() => handleMoveTo(f.id)}>
                    {f.name}
                  </DropdownMenuItem>
                ))}
              {project.folder_id && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleMoveTo(null)}>
                    Hors dossier
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 className="size-3.5" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
