# Oravec Monday

Webapp de gestion de projet inspirée de Monday — dossiers · projets · tâches · sous-tâches · assignés multiples · routines récurrentes · vue d'ensemble par personne.

Voir [`CLAUDE.md`](./CLAUDE.md) pour la vision et l'architecture.

---

## 🚀 Lancer en local

```bash
pnpm install
pnpm exec supabase start   # Postgres + Auth via Docker
pnpm dev                   # Next.js 16
```

Puis http://localhost:3000.

### Réinitialiser la base locale

```bash
pnpm exec supabase db reset   # recrée et rejoue les migrations
pnpm exec supabase status     # Studio: http://localhost:54323
```

---

## 🧱 Stack

Next.js 16 (App Router · Turbopack) · TypeScript · Tailwind v4 · shadcn/ui (Base UI) · TanStack Query · @dnd-kit · Supabase (Postgres + Auth + RLS + pg_cron).

## 📁 Structure

```
src/
├─ app/
│  ├─ layout.tsx, page.tsx, globals.css, providers.tsx
│  ├─ login/, signup/         # auth Supabase email+password
│  └─ app/                    # routes protégées
│     ├─ layout.tsx           # sidebar + main
│     ├─ page.tsx             # vue d'ensemble (batteries)
│     └─ projects/[id]/       # vue projet (table tâches + paste + routines)
├─ components/
│  ├─ ui/                     # primitives shadcn
│  ├─ auth/                   # AuthForm
│  ├─ sidebar/                # AppShell, AppSidebar (dnd-kit)
│  ├─ tasks/                  # TaskRow, StatusPill, Assignees, PasteTasksDialog
│  ├─ routines/               # RoutinesPanel, RoutineFormDialog
│  └─ overview/               # WorkloadCard
├─ lib/
│  ├─ supabase/               # client/server/middleware/database.types
│  ├─ queries.ts              # hooks TanStack Query (queries + mutations)
│  └─ utils.ts
└─ proxy.ts                   # middleware Next 16 (auth gate)
supabase/migrations/          # SQL (wipe FamTask + Monday-clone)
```
