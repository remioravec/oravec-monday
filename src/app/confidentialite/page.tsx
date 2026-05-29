import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Oravec",
  description:
    "Comment Oravec collecte, utilise et protège vos données, y compris les données Google.",
};

const CONTACT = "administration@remi-oravec.fr";
const UPDATED = "29 mai 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Retour
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Politique de confidentialité
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dernière mise à jour : {UPDATED}
        </p>

        <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-foreground/90">
          <Section title="1. Qui sommes-nous">
            <p>
              Oravec (« l&apos;application ») est un outil de gestion de projet
              et de tâches à usage d&apos;équipe. Le responsable du traitement
              des données peut être contacté à l&apos;adresse{" "}
              <a className="text-primary underline" href={`mailto:${CONTACT}`}>
                {CONTACT}
              </a>
              .
            </p>
          </Section>

          <Section title="2. Données que nous collectons">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Compte</strong> : adresse e-mail, nom affiché, avatar,
                couleur de profil.
              </li>
              <li>
                <strong>Contenu</strong> : dossiers, projets, tâches,
                sous-tâches, statuts, échéances, assignations, pièces jointes.
              </li>
              <li>
                <strong>Données Google</strong> (uniquement si vous connectez
                votre compte Google) : votre adresse e-mail Google, la liste de
                vos agendas et leurs événements (pour l&apos;affichage des
                disponibilités et la synchronisation), et les fichiers Google
                Drive que vous choisissez explicitement de joindre via le
                sélecteur Google.
              </li>
            </ul>
          </Section>

          <Section title="3. Comment nous utilisons ces données">
            <ul className="list-disc space-y-1 pl-5">
              <li>Fournir et synchroniser vos projets, tâches et routines.</li>
              <li>
                Afficher vos disponibilités et créer/mettre à jour des
                événements dans l&apos;agenda Google que vous avez choisi.
              </li>
              <li>
                Joindre à vos tâches les fichiers Google Drive que vous
                sélectionnez.
              </li>
              <li>
                Envoyer des notifications (par ex. lorsqu&apos;une tâche vous est
                assignée), si vous les activez.
              </li>
            </ul>
          </Section>

          <Section title="4. Utilisation des données des API Google (Limited Use)">
            <p>
              L&apos;utilisation et le transfert par Oravec des informations
              reçues des API Google respectent la{" "}
              <a
                className="text-primary underline"
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google API Services User Data Policy
              </a>
              , y compris ses exigences de <strong>Limited Use</strong>. En
              particulier, les données Google ne sont utilisées que pour fournir
              les fonctionnalités décrites ci-dessus, ne sont pas vendues, ne
              sont pas utilisées à des fins publicitaires, et ne sont pas
              transférées à des tiers sauf si nécessaire pour fournir le service,
              pour des raisons de sécurité, ou pour se conformer à la loi.
            </p>
          </Section>

          <Section title="5. Stockage et sous-traitants">
            <p>
              Les données sont hébergées chez <strong>Supabase</strong> (base de
              données et authentification, région UE) et l&apos;application est
              servie via <strong>Vercel</strong>. Les jetons d&apos;accès Google
              sont stockés de manière restreinte et utilisés uniquement côté
              serveur pour les fonctionnalités que vous activez.
            </p>
          </Section>

          <Section title="6. Conservation et suppression">
            <p>
              Vos données sont conservées tant que votre compte est actif. Vous
              pouvez à tout moment déconnecter votre compte Google (les jetons
              associés sont alors supprimés) ou demander la suppression de votre
              compte et de vos données en nous écrivant à{" "}
              <a className="text-primary underline" href={`mailto:${CONTACT}`}>
                {CONTACT}
              </a>
              .
            </p>
          </Section>

          <Section title="7. Vos droits">
            <p>
              Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès,
              de rectification, d&apos;effacement et de portabilité de vos
              données. Pour exercer ces droits, contactez-nous à{" "}
              <a className="text-primary underline" href={`mailto:${CONTACT}`}>
                {CONTACT}
              </a>
              .
            </p>
          </Section>

          <Section title="8. Contact">
            <p>
              Pour toute question relative à cette politique :{" "}
              <a className="text-primary underline" href={`mailto:${CONTACT}`}>
                {CONTACT}
              </a>
              .
            </p>
          </Section>
        </div>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Oravec. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
