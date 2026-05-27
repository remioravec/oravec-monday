# FamTask 🏡🔋

Webapp de gestion familiale — un « Monday-like familial » : projets, tâches et
routines à l'échelle du foyer, avec une **batterie de charge mentale** par membre
et une UX pensée **dès 3 ans**. Voir [`CLAUDE.md`](./CLAUDE.md) pour la vision
complète et l'architecture.

> ⚠️ **MVP en construction.** Cette base est fonctionnelle en local mais loin
> d'être complète. Voir « État » plus bas.

---

## 🚀 Lancer l'app en local (Codespace)

Tout est déjà installé (Node, pnpm, Docker). Il faut **deux processus** : la stack
Supabase (base + auth) et le serveur Next.js.

```bash
# 1. Démarrer Supabase (Postgres + Auth + Storage via Docker)
pnpm exec supabase start

# 2. Démarrer l'app
pnpm dev
```

Puis ouvre **http://localhost:3000** (dans le Codespace, VS Code propose
d'ouvrir le port 3000 dans le navigateur — clique « Open in Browser »).

### Se connecter et tester

1. Sur la page d'accueil, clique **« Créer mon foyer »** → page de connexion.
2. Saisis un email + mot de passe quelconques (ex. `papa@test.fr` / `motdepasse`)
   et clique **« Créer un compte »**. _(Supabase local auto-confirme les emails,
   pas besoin de cliquer un lien.)_
3. Tu arrives sur l'**onboarding** : nomme ton foyer, choisis ton prénom et ta
   couleur → « Créer mon foyer ».
4. Sur le **dashboard** tu peux :
   - **+ Membre** : ajouter un enfant (lecteur ou Kid) avec sa couleur ;
   - **+ Dossier** → **+ Projet** → **+ Tâche** (titre, coût de batterie, priorité,
     assignés) ;
   - cocher une tâche pour la valider → les **batteries du foyer** se recalculent.

### Réinitialiser / inspecter la base

```bash
pnpm exec supabase db reset   # recrée la base et rejoue les migrations
pnpm exec supabase status     # URLs locales (Studio: http://localhost:54323)
node scripts/e2e-test.mjs      # test bout-en-bout du backend + RLS
```

> **Accès depuis l'extérieur du Codespace** (téléphone, autre machine) : il faut
> exposer le port 3000 _et_ 54321 en visibilité « public » dans l'onglet PORTS de
> VS Code, puis pointer `NEXT_PUBLIC_SUPABASE_URL` (dans `.env.local`) vers l'URL
> publique forwardée du port 54321. Pour un vrai accès permanent, on déploiera sur
> Vercel + Supabase cloud (nécessite tes comptes — cf. tâche de déploiement).

---

## 🧱 Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui (Base UI) ·
TanStack Query + Zustand · Supabase (Postgres + Auth + RLS).

## ✅ État

**Fonctionne** : auth parent (email/mot de passe), onboarding foyer, dashboard,
CRUD dossiers/projets/tâches/membres, batteries prédictives, RLS complète et
testée (isolation des foyers, PIN jamais exposé).

**Pas encore** : connexion enfant par PIN, vues Kanban/Calendrier, récurrence,
mode Kid (pictos + TTS), notifications, PWA, déploiement. Suivi dans la liste de
tâches.

## 📁 Structure

```
src/
├─ app/            # routes (/, /login, /onboarding, /app) + layout, globals.css
├─ components/     # composants applicatifs + ui/ (shadcn)
├─ lib/            # design.ts, battery.ts, profile.ts, supabase/{client,server,middleware}
└─ proxy.ts        # ex-middleware Next (refresh session + protection des routes)
supabase/migrations/  # schéma + RLS
scripts/e2e-test.mjs  # test backend de bout en bout
```
