/**
 * Scopes OAuth Google demandés à la connexion.
 * - openid/email/profile : identité de base
 * - drive.file : pièces jointes depuis le Google Picker (fichiers ouverts/créés par l'app)
 * - calendar : lister les agendas + lire/écrire les événements (sync bidirectionnelle)
 */
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/calendar",
].join(" ");
