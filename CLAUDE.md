# CLAUDE.md

Guide de référence pour travailler dans ce dépôt. Prose en français ; identifiants de code, commandes et termes techniques en anglais.

---

## 1. Vue d'ensemble

**FamTask** (nom de travail) est une **web application de gestion familiale** — un « Monday-like familial » : tableaux de projets + tâches récurrentes + routines à l'échelle d'un foyer. Deux différenciateurs forts :

- **Batterie de charge mentale** 🔋 : chaque membre a 100 % de capacité ; chaque tâche en consomme un %, ce qui rend la surcharge visible et prévisible.
- **Accessibilité enfant dès 3 ans** : un « mode Kid » 100 % pictogrammes + audio + validation tactile, en plus d'un mode parent et d'un mode enfant lecteur.

Produit : **PWA installable**, responsive desktop + mobile.

> ⚠️ **Projet en cours de construction.** La fondation est posée (Next.js scaffoldé, design system, composants shadcn). Le backend (Supabase) et la plupart des features MVP ne sont **pas encore implémentés**. Ce document décrit la cible (MVP) issue du cahier des charges ; vérifie toujours qu'un fichier, une commande ou une table existe avant de t'y fier. L'avancement réel est suivi dans la liste de tâches de la session.

---

## 2. État du projet

- **Phase actuelle** : développement MVP en cours (fondation posée). Le cahier des charges (v0.1) fait foi.
- **Effort cible MVP** : ~8-10 semaines de dev solo.
- **Fait** : scaffold Next.js + design system ; Supabase local + schéma + RLS (testée e2e) ; auth parent (email/mot de passe), onboarding foyer, dashboard, CRUD dossiers/projets/tâches/membres, batterie prédictive de base. **À venir** : connexion enfant par PIN, vues Kanban/Calendrier, récurrence, mode Kid, notifs, PWA, déploiement.
- **Pour lancer/tester en local** : voir [`README.md`](./README.md).

### Décisions ouvertes — NE PAS trancher sans validation explicite de Rémi

Ces points du cahier des charges (§9) sont **non arbitrés**. Si une tâche dépend de l'un d'eux, demander avant de coder :

1. **Monétisation** : freemium vs abonnement plat (impacte la modélisation Stripe/GoCardless).
2. **Coût batterie** : suggestion auto (ML léger sur durée) vs 100 % manuel en MVP.
3. **Routines séquentielles** : dans le MVP ou repoussées en v1.5 (~2 semaines de dev).
4. **Mode Kid** : version « lite » (pictos + tuiles, sans audio) vs version complète d'office.
5. **Banque de pictogrammes** : licence (Flaticon Pro / Noun Project / SVG custom).
6. **Nom & branding** : `FamTask` est un placeholder — domaine et identité à valider.

---

## 3. Stack technique

| Couche | Techno | Notes |
|---|---|---|
| Frontend | **Next.js 16 (App Router, Turbopack)** + TypeScript | SSR, PWA. _Le cahier des charges visait la 15 ; `create-next-app` installe désormais la 16 — choix retenu._ |
| Styles | **Tailwind CSS v4** | |
| UI | **shadcn/ui** (sur **Base UI**, pas Radix) | ⚠️ pas de `asChild` — utiliser la prop `render={<Comp/>}` (cf. §8) |
| State | **Zustand** (client) + **TanStack Query** (serveur/cache) | TanStack Query persister (IndexedDB) pour l'offline |
| Backend | **Supabase** | Postgres + Auth + Realtime + Storage |
| Auth | Supabase Auth (magic link parents) + **Edge Function PIN/avatar** (enfants, sans email) | |
| Hosting | **Vercel** | |
| Notifs push | **Web Push API** + Supabase Edge Functions | pas de tiers payant |
| Audio (mode Kid) | **Web Speech API** (TTS navigateur) en MVP ; ElevenLabs en v2 | |
| Pictos / images | Supabase Storage + banque interne SVG | |

---

## 4. Architecture & modèle de données

### Schéma macro (cible)

```
households (id, name, created_at)
├─ profiles (id, household_id, role[parent|child], display_name, avatar, color,
│            pin_hash, battery_cycle[daily|weekly])
├─ folders (id, household_id, name, icon, color, position)
│  └─ projects (id, folder_id, name, view_default, members[])
│     └─ tasks (id, project_id, title, description, status, priority, due_at,
│               battery_cost, recurrence_rule, pictogram_url, audio_url)
│        ├─ task_assignees (task_id, profile_id)
│        └─ subtasks (id, task_id, title, done, position)
├─ routines (id, household_id, name, trigger_type, trigger_time, task_template_ids[])
├─ automations (id, household_id, trigger_json, action_json, active)   -- v1.5
├─ notifications (id, profile_id, type, payload, read_at)
└─ battery_snapshots (id, profile_id, cycle_start, cycle_end, used_pct) -- historique
```

### Hiérarchie

`household` = racine (2 à N profils). `folders` → `projects` (tableaux) → `tasks` → `subtasks`. Pas de sous-dossiers en MVP.

### Trois modes d'interface

| Mode | Cible | Caractéristiques |
|---|---|---|
| **Parent** | admin / co-admin | densité standard, sidebar, toutes les vues |
| **Enfant lecteur** (≥ 6 ans) | lecture + validation | sidebar masquée, grandes tuiles, textes simplifiés |
| **Kid** (3-5 ans, non-lecteur) | validation tactile | plein écran, 1 tâche à la fois, pictos, TTS auto, **validation par tap long** |

### Vues projet

Kanban (défaut, colonnes fixes `À faire` / `En cours` / `Fait`), Liste, Calendrier (Calendrier = v1.5).

---

## 5. Règles métier critiques

- **Batterie = prédictive, pas réactive** : c'est la **somme des tâches prévues** sur le cycle, pas un compteur de tâches faites. Elle se **recharge au reset** (quotidien 00:00 ou hebdo lundi 00:00, au choix par profil).
- **Seuils de couleur** : vert `< 60 %`, orange `60-85 %`, rouge `> 85 %`. Alerte au parent si un profil dépasse **85 %** sur un cycle.
- **Coût d'une tâche** : 1-50 % (manuel ou auto-suggéré — cf. décision ouverte §2.2).
- **Sous-tâches** : la tâche parente passe à `Fait` quand 100 % des sous-tâches sont cochées (configurable). Pas d'assignation séparée en MVP (héritée du parent).
- **Hiérarchie des droits** (voir aussi RLS §6) :

| Action | Parent | Enfant lecteur | Enfant non-lecteur |
|---|:---:|:---:|:---:|
| Créer dossier / projet | ✅ | ❌ | ❌ |
| Créer tâche | ✅ | ✅ (projets autorisés) | ❌ |
| Assigner | ✅ | à soi-même | ❌ |
| Valider sa tâche | ✅ | ✅ | ✅ (tap picto) |
| Valider tâche d'autrui | ✅ | ❌ | ❌ |
| Créer automatisation | ✅ | ❌ | ❌ |
| Voir batterie des autres | ✅ | ✅ (lecture seule) | ❌ |

---

## 6. Contraintes NON négociables

### Sécurité — RLS Supabase (à implémenter dès la 1re table)

Toute table est protégée par Row Level Security. Règles clés :

- Un profil ne voit **que** les données de son `household_id`.
- Un enfant ne peut `UPDATE` que les tâches où il figure dans `task_assignees`.
- Un enfant ne peut **jamais** `DELETE`.
- Un enfant ne peut pas `INSERT` dans `folders`, `projects`, `automations`.
- Les `pin_hash` enfants ne sont **jamais** renvoyés au client.

> Règle de travail : **RLS-first**. Ne pas exposer de table sans policy. Ne jamais contourner la RLS via la `service_role` côté client.

### RGPD (dès le MVP)

- Données enfants = **sensibles** → **hébergement UE obligatoire** : Supabase région **`eu-west-3` (Paris)**.
- Pas de tracking analytics tiers en MVP (Plausible en option si besoin).
- Suppression de compte = **purge effective sous 30 jours**.
- **Aucun partage de données entre foyers.**
- Consentement parental explicite pour créer un profil enfant.
- Mentions légales + politique de confidentialité présentes dès le MVP.

### Performance

- LCP **< 2,5 s** sur mobile 4G ; TTI **< 3,5 s**.
- Offline : lecture des tâches du jour en cache (IndexedDB via TanStack Query persister).

---

## 7. Design system & UX

**Principes** : minimaliste (1 action principale / écran, max 3 niveaux de profondeur), famille-friendly (couleurs chaudes, arrondis généreux), accessibilité 3 ans, **la couleur du profil est le fil rouge visuel partout**.

- **Typo** : Inter (UI) + Fraunces (titres) — gratuites.
- **Palette par profil** : Parent 1 `#5B7FFF`, Parent 2 `#FF6B9D`, Enfant 1 `#FFB84D`, Enfant 2 `#5DD39E`.
- **Neutres** : fond `#FAFAF7`, texte `#1A1A1A`, séparateurs `#E5E5E0`.
- **Radius** : cartes `16px`, modales `24px`, boutons primaires `999px`.
- **Mode Kid** : boutons **≥ 64px**, pas de texte, sons, animations de validation (confettis), **tap long** pour éviter les validations accidentelles.

**Responsive** : desktop (sidebar fixe + tableau + panneau détail droite) ; tablette (sidebar rétractable) ; mobile (**bottom tabs** : Dossiers / Tâches / Batterie / Profil, détail en bottom sheet). **PWA** : manifest + service worker + icônes + mode offline lecture seule.

> ⚠️ La palette et la charte (§4.3 du cahier des charges) sont **« proposition à valider »** — confirmer avant de les figer dans le thème.

---

## 8. Conventions de dev

- **TypeScript strict** ; pas de `any` non justifié.
- **RLS-first** (cf. §6) : toute nouvelle table = policies dans la même migration.
- **Accessibilité** : tout composant interactif doit fonctionner au clavier et respecter les tailles de cible du mode concerné (≥ 64px en Kid). Ne pas désactiver le zoom navigateur (WCAG 1.4.4).
- **i18n** : produit FR (`lang="fr"`) ; prévoir des libellés externalisables même si une seule langue en MVP.
- **Design system** : couleurs de profil et seuils de batterie centralisés dans `src/lib/design.ts`. Tokens CSS dans `src/app/globals.css` (`bg-profile-*`, `bg-battery-*`). Titres en `font-heading` (Fraunces), UI en `font-sans` (Inter).
- **UI** : composants shadcn dans `src/components/ui/`. Boutons primaires en `rounded-full`, cartes/modales en arrondis généreux.

### Structure

```
src/
├─ app/            # routes App Router (layout, page, globals.css)
├─ components/     # composants applicatifs (ex. battery-gauge.tsx)
│  └─ ui/          # primitives shadcn/ui
└─ lib/            # utils + logique partagée (design.ts, utils.ts)
```

### Pièges connus (leçons déjà payées)

1. **shadcn = Base UI, pas Radix.** Pas de `asChild`. Pour rendre un composant
   custom (Link, Button) : `<DialogTrigger render={<Button .../>}>Label</DialogTrigger>`
   ou `<Button render={<Link href=.../>}>`.

2. **RLS + PostgREST `return=representation` (déclenché par `.select()` après un
   `insert`)** : une policy `WITH CHECK`/`USING` qui contient une **sous-requête
   corrélée à la nouvelle ligne** (ex. `EXISTS(SELECT FROM autre_table WHERE
   x = ma_table.col)`), ou une policy `SELECT` qui **re-interroge la table en cours
   d'insertion**, échoue (42501) car la nouvelle ligne n'est pas visible dans la CTE
   modifiante. ✅ **Toujours** déporter la logique dans une fonction
   `SECURITY DEFINER` qui reçoit la colonne en **argument** (cf. `folder_in_my_household`,
   `can_access_project`, `is_project_member` dans `supabase/migrations/`). Voir
   migrations `0005`/`0006`.

3. **Next 16** : le fichier `middleware.ts` est déprécié → renommé `proxy.ts`
   (fonction `proxy`). Même rôle, même `config.matcher`.

4. **Auth parent** : MVP local en **email/mot de passe** (Supabase local
   auto-confirme). Le cahier des charges vise le **magic link** — bascule à prévoir
   avant prod.

### Commandes

```bash
pnpm install            # dépendances
pnpm dev                # serveur de dev (Turbopack)
pnpm build              # build de production
pnpm start              # servir le build
pnpm lint               # ESLint
# Backend (à venir, tâche #3) :
# supabase start        # stack Supabase locale (Docker)
# supabase db push      # appliquer les migrations
```

Pas de script `typecheck` dédié pour l'instant — `pnpm build` lance la vérification TypeScript. Vérifier le `package.json` réel avant d'exécuter.

---

## 9. Roadmap

- **MVP** : auth multi-profil (parent email / enfant PIN), foyer/dossiers/projets/tâches/sous-tâches, vues Kanban + Liste, batterie quotidienne/hebdo, récurrence simple, mode Kid (pictos + TTS), notifs push web + email, PWA.
- **v1.5** : vue Calendrier, routines séquentielles, automatisations basiques (si X alors Y), banque de pictos enrichie, onboarding interactif.
- **v2** : app mobile native (Expo), gamification enfant (points/badges), intégration calendriers externes (Google/iCloud), IA (suggestion coût batterie, génération de routines).

---

_Document vivant — mettre à jour quand l'architecture, les conventions ou les décisions ouvertes évoluent._
