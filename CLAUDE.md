# CLAUDE.md

Guide de référence pour travailler dans ce dépôt. Prose en français ; identifiants de code, commandes et termes techniques en anglais.

---

## 1. Vue d'ensemble

**Oravec Monday** est une **web application de gestion de projet** type Monday : dossiers → projets → tâches → sous-tâches, avec assignés multiples, statuts en pill colorés, routines récurrentes, et une vue d'ensemble qui affiche la charge de travail par personne (batterie horizontale gris/orange/vert).

> **Pivot 2026-05-28** : ce repo a démarré comme « FamTask » (app famille avec batterie de charge mentale et mode enfant). Rémi a pivoté vers un clone Monday générique — voir mémoire `famtask-build-approach`. CLAUDE.md a été réécrit pour la nouvelle direction.

---

## 2. État

- **Phase** : MVP fonctionnel, déployable.
- **Auth** : Supabase email + mot de passe. Profil créé automatiquement par trigger `handle_new_user` à l'inscription.
- **Fait** : auth, sidebar dossiers/projets (drag & drop dnd-kit), CRUD dossiers/projets, vue tableau tâches (desktop) + cards (mobile), inline edit titres, status pills, due date inline, multi-assignees popover, sous-tâches (un niveau), vue d'ensemble batteries, paste-modal copier-coller, panel routines, **sync Realtime sur les tâches** (hook `useRealtimeTasks`).
- **À venir éventuel** : drag & drop des tâches entre statuts, vue Calendrier, gestion fine des permissions par projet, monétisation, Stripe.

---

## 3. Stack

| Couche | Techno | Notes |
|---|---|---|
| Frontend | **Next.js 16 (App Router, Turbopack)** + TypeScript | SSR. |
| Styles | **Tailwind CSS v4** | tokens dans `globals.css`. |
| UI | **shadcn/ui** sur **Base UI** (pas Radix) | ⚠️ pas de `asChild` — utiliser `render={<Comp/>}`. |
| State serveur | **TanStack Query** | hooks centralisés dans `src/lib/queries.ts`. |
| Drag & drop | **@dnd-kit** | sidebar reorder folders + projects. |
| Backend | **Supabase** | Postgres + Auth + Realtime + pg_cron. |
| Hosting | **Vercel** | déploiement auto sur push `main`. |

---

## 4. Modèle de données

Schéma complet dans `supabase/migrations/20260528000001_monday_clone.sql`.

```
profiles (id ⟶ auth.users, full_name, avatar_url, color, created_at)
folders (id, name, position, created_at)
projects (id, folder_id ⟶ folders | null, name, color, position, created_at)
tasks (id, project_id ⟶ projects, parent_task_id ⟶ tasks | null,
       title, description, status, due_date, position, created_by, created_at, updated_at)
task_assignees (task_id ⟶ tasks, user_id ⟶ profiles)        -- PK (task_id, user_id)
routines (id, project_id, title, description, frequency,
          days_of_week int[], day_of_month, time_of_day,
          active, last_generated_date, created_by, created_at)
routine_assignees (routine_id, user_id)                       -- PK
person_workload (view : profiles ⨝ task_assignees ⨝ tasks)  -- counts par statut
```

**Sous-tâches** : `tasks` s'auto-référence via `parent_task_id`. Profondeur 1 en MVP (tâche → sous-tâche, pas de sous-sous-tâche).

**Statuts** : `'a_faire' | 'en_cours' | 'fait'` (en base). Mapping FR + couleurs côté front (`status-pill.tsx`).

**Position** : entier sur folders / projects / tasks pour le reorder manuel. Drag & drop met à jour positions séquentiellement.

**Récurrences** : `generate_recurring_tasks()` exécutée chaque jour à 00:00 via `pg_cron`. Crée les tâches pour les routines actives dont le `last_generated_date` est inférieur à aujourd'hui et dont la règle (daily / weekly / monthly) matche.

---

## 5. Contraintes & règles métier

### RLS

Politique simple « authentifié = accès complet » sur toutes les tables, via `create policy "auth_all" ... for all to authenticated using (true) with check (true)`. Adapté à un outil **interne de confiance** (équipe restreinte). À resserrer par projet/owner si l'usage s'élargit.

### Auth

- Inscription email + mot de passe ; le trigger `handle_new_user` peuple `profiles.full_name` depuis `raw_user_meta_data.full_name` (sinon fallback email).
- `mailer_autoconfirm = true` sur le projet cloud → les comptes sont actifs sans confirmation par email.

### Performance

- LCP cible < 2,5 s mobile 4G.
- TanStack Query : `staleTime: 30s`, optimistic update sur l'édition de tâche.
- Inserts batch (paste-to-create) en un seul `insert(rows)`.

---

## 6. Conventions de dev

- **TypeScript strict**, pas de `any` non justifié.
- **Composants UI** : primitives shadcn dans `src/components/ui/`, code applicatif dans `src/components/{sidebar,tasks,routines,overview,auth}/`.
- **Hooks de données** : tout dans `src/lib/queries.ts` (`useTasks`, `useUpsertRoutine`, etc.). Les pages restent fines.
- **i18n** : produit en FR (`lang="fr"`). Libellés directement dans le JSX pour l'instant.
- **Status pill** : couleurs centralisées dans `status-pill.tsx` (`STATUS_BG`).

### Pièges connus

1. **shadcn = Base UI, pas Radix.** Pas de `asChild`. Pour composer : `<DialogTrigger render={<Button .../>}>Label</DialogTrigger>` ou `<Button render={<Link href=.../>}>`.

2. **Types Supabase** : `database.types.ts` est écrit à la main. **Chaque table/view doit avoir `Relationships: []`**, sinon `postgrest-js` ne matche pas `GenericTable` et les types `Insert`/`Update` tombent à `never` à l'usage (erreur stricte sur `.insert(rows)`). Si tu régénères via `supabase gen types`, vérifie que `Relationships`, `CompositeTypes` sont présents.

3. **Next 16** : le fichier `middleware.ts` est renommé `proxy.ts` (fonction `proxy`). Même rôle, même `config.matcher`.

4. **React 19 strict purity** : ne pas `setState` dans `useEffect` (lint `react-hooks/set-state-in-effect`). Pour la pré-remplissage de formulaire selon une prop, utiliser un **wrapper qui attend la donnée puis monte le corps avec `key={id}`** — chaque ouverture remonte le formulaire avec ses initialisations dans `useState(initial)`. Voir `RoutineFormDialog` → `RoutineFormLoader` → `RoutineFormBody`.

5. **`Date.now()` interdit** dans un composant client (lint `react-hooks/purity`). Passer les valeurs « non-pures » (timestamps, counts) en prop depuis l'appelant.

### Commandes

```bash
pnpm install
pnpm dev                # serveur de dev (Turbopack)
pnpm build              # build de prod (lance aussi le typecheck)
pnpm lint               # ESLint
pnpm exec supabase start          # stack Supabase locale (Docker)
pnpm exec supabase db reset       # recrée la base locale + rejoue migrations
pnpm exec supabase db push --linked  # pousse les migrations vers le cloud
```

---

## 7. Infra cloud

- **Supabase cloud** : project-ref `kbapkfwcxrixpkbbtdzm`, région **West EU (Ireland)**. Lié au repo via `supabase link`. Le SQL de pivot (wipe + recreate) est dans la migration `20260528000001_monday_clone.sql` — appliquée via le dashboard SQL Editor (action destructive : drop tout `public` puis recrée).
- **Vercel** : project lié au repo GitHub par Rémi, auto-deploy sur push `main`. Env vars requises côté Vercel : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Pas de `service_role` côté front.

---

## 8. Roadmap

- **v1** : drag & drop des tâches entre statuts (kanban view), reorder tâches dans le tableau. ~~sync Realtime sur `tasks`~~ ✅ livré (`useRealtimeTasks` + migration `20260528000002_realtime_tasks.sql`).
- **v1.5** : vue Calendrier, permissions par projet (members[]), historique d'activité.
- **v2** : intégration calendriers externes (Google), notifications push, mobile native.

---

_Document vivant — mettre à jour quand l'architecture, les conventions ou les décisions ouvertes évoluent._
