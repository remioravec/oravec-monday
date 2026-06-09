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
  Trash2,
  Pencil,
  ArrowRightLeft,
  Eye,
  EyeOff,
  Repeat,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { UserMenu } from "@/components/sidebar/user-menu";
import { WorkspaceSwitcher } from "@/components/sidebar/workspace-switcher";
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
  useHiddenItems,
  useToggleHidden,
} from "@/lib/queries";

type Folder = ReturnType<typeof useFolders>["data"] extends (infer T)[] | undefined
  ? T
  : never;
type Project = ReturnType<typeof useProjects>["data"] extends (infer T)[] | undefined
  ? T
  : never;

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: foldersAll = [] } = useFolders();
  const { data: projectsAll = [] } = useProjects();
  const { data: hidden } = useHiddenItems();
  const reorderFolders = useReorderFolders();
  const reorderProjects = useReorderProjects();
  const createFolder = useCreateFolder();
  const createProject = useCreateProject();
  const [showHidden, setShowHidden] = useState(false);

  const folders = showHidden
    ? foldersAll
    : foldersAll.filter((f) => !hidden?.folders.has(f.id));
  const projects = showHidden
    ? projectsAll
    : projectsAll.filter((p) => !hidden?.projects.has(p.id));
  const routineProjects = projects.filter((p) => p.is_routine);
  const hiddenCount =
    (hidden?.folders.size ?? 0) +
    (hidden?.projects.size ?? 0);

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

  async function handleNewProject() {
    const name = window.prompt("Nom du projet ?");
    if (!name?.trim()) return;
    await createProject.mutateAsync(
      { name: name.trim(), folder_id: null, position: projects.length },
      {
        onError: (e) => toast.error(e.message),
        onSuccess: () => toast.success("Projet créé"),
      },
    );
  }

  async function handleAddRoutine() {
    const name = window.prompt("Nom de la routine ?");
    if (!name?.trim()) return;
    let folderId: string | null = null;
    if (folders.length > 0) {
      const listing = folders
        .map((f, i) => `${i + 1}. ${f.name}`)
        .join("\n");
      const choice = window.prompt(
        `Dans quel dossier ranger la routine ?\n0. (aucun)\n${listing}`,
        "0",
      );
      const idx = Number(choice);
      if (!Number.isNaN(idx) && idx >= 1 && idx <= folders.length) {
        folderId = folders[idx - 1].id;
      }
    }
    await createProject.mutateAsync(
      {
        name: name.trim(),
        folder_id: folderId,
        position: routineProjects.length,
        is_routine: true,
      },
      {
        onError: (e) => toast.error(e.message),
        onSuccess: () =>
          toast.success("Routine créée — configure la récurrence sur sa page"),
      },
    );
  }

  return (
    <div className="flex h-full flex-col bg-white text-sidebar-foreground">
      {/* Header : logo sur fond blanc */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Logo />
      </div>

      {/* Corps de la sidebar : démarre par un arrondi juste sous le logo */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[1.75rem] border-t border-sidebar-border bg-muted/60">
      {/* Sélecteur d'espace de travail */}
      <WorkspaceSwitcher onNavigate={onNavigate} />
      {/* CTA primaire « Nouveau » (style Drive) */}
      <div className="px-2 pt-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                aria-label="Créer un élément"
              />
            }
          >
            <Plus className="size-4" />
            Nouveau
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={handleNewProject}>
              <LayoutGrid className="size-3.5" />
              Projet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddFolder}>
              <FolderIcon className="size-3.5" />
              Dossier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddRoutine}>
              <Repeat className="size-3.5" />
              Routine
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
        <Link
          href="/app/routines"
          onClick={onNavigate}
          className={navLinkClass(pathname.startsWith("/app/routines"))}
        >
          <Repeat className="size-4" />
          Routines
        </Link>
      </nav>


      {/* Folders */}
      <div className="flex items-center justify-between px-4 pt-2 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        <span>Dossiers</span>
        <div className="flex items-center gap-0.5">
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={handleAddRoutine}
            aria-label="Nouvelle routine"
            title="Nouvelle routine"
          >
            <Repeat className="text-purple-600" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={handleAddFolder}
            aria-label="Ajouter un dossier"
          >
            <Plus />
          </Button>
        </div>
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

      {/* Footer : show hidden + user menu */}
      <div className="border-t px-2 py-2">
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowHidden((s) => !s)}
            className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent/60"
          >
            {showHidden ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
            {showHidden ? "Masquer les éléments cachés" : `Afficher (${hiddenCount}) cachés`}
          </button>
        )}
        <UserMenu onNavigate={onNavigate} />
      </div>
      </div>
    </div>
  );
}

function navLinkClass(active: boolean) {
  return [
    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
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
  const toggleHidden = useToggleHidden();
  const { data: hidden } = useHiddenItems();
  const isHidden = hidden?.folders.has(folder.id) ?? false;

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
            <DropdownMenuItem
              onClick={() =>
                toggleHidden.mutate({
                  kind: "folder",
                  id: folder.id,
                  hide: !isHidden,
                })
              }
            >
              {isHidden ? (
                <>
                  <Eye className="size-3.5" />
                  Réafficher
                </>
              ) : (
                <>
                  <EyeOff className="size-3.5" />
                  Masquer pour moi
                </>
              )}
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
  const toggleHidden = useToggleHidden();
  const { data: hidden } = useHiddenItems();
  const isHidden = hidden?.projects.has(project.id) ?? false;

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
        "flex flex-1 items-center gap-1.5 rounded-md px-2 py-1 transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "hover:bg-sidebar-accent/60",
      ].join(" ")}
    >
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: project.color ?? "#94a3b8" }}
      />
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
          className="flex flex-1 items-center gap-1.5 truncate text-sm"
        >
          {project.is_routine && (
            <Repeat
              className="size-3 shrink-0 text-purple-600"
              aria-label="Routine"
            />
          )}
          <span className="truncate">{project.name}</span>
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
          <DropdownMenuItem
            onClick={() =>
              toggleHidden.mutate({
                kind: "project",
                id: project.id,
                hide: !isHidden,
              })
            }
          >
            {isHidden ? (
              <>
                <Eye className="size-3.5" />
                Réafficher
              </>
            ) : (
              <>
                <EyeOff className="size-3.5" />
                Masquer pour moi
              </>
            )}
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
