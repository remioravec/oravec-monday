/**
 * Intégration Google Picker (client). Charge dynamiquement `gapi` + la lib
 * `picker`, ouvre la fenêtre de sélection Drive et renvoie les fichiers choisis.
 *
 * Le typage de `gapi`/`google.picker` est minimal et ciblé (pas de SDK typé
 * disponible) — d'où quelques interfaces locales plutôt que `any`.
 */

export interface PickedDriveFile {
  id: string;
  name: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
}

interface PickerDoc {
  id: string;
  name: string;
  url?: string;
  mimeType?: string;
  sizeBytes?: number;
}
interface PickerResult {
  action: string;
  docs?: PickerDoc[];
}
interface PickerBuilder {
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  addView(view: unknown): PickerBuilder;
  setCallback(cb: (data: PickerResult) => void): PickerBuilder;
  setTitle(title: string): PickerBuilder;
  build(): { setVisible(v: boolean): void };
}
interface GooglePickerNs {
  PickerBuilder: new () => PickerBuilder;
  DocsView: new () => unknown;
  ViewId: { DOCS: unknown };
  Action: { PICKED: string; CANCEL: string };
}
interface Gapi {
  load(name: string, cb: () => void): void;
}

declare global {
  interface Window {
    gapi?: Gapi;
    google?: { picker?: GooglePickerNs };
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Échec chargement ${src}`));
    document.head.appendChild(s);
  });
}

let pickerReady: Promise<void> | null = null;

async function ensurePickerLoaded(): Promise<void> {
  if (pickerReady) return pickerReady;
  pickerReady = (async () => {
    await loadScript("https://apis.google.com/js/api.js");
    await new Promise<void>((resolve) => {
      window.gapi!.load("picker", () => resolve());
    });
  })();
  return pickerReady;
}

export async function openDrivePicker(opts: {
  accessToken: string;
  apiKey: string;
}): Promise<PickedDriveFile[]> {
  await ensurePickerLoaded();
  const picker = window.google?.picker;
  if (!picker) throw new Error("Google Picker indisponible");

  return new Promise((resolve, reject) => {
    try {
      const builder = new picker.PickerBuilder()
        .setOAuthToken(opts.accessToken)
        .setDeveloperKey(opts.apiKey)
        .setTitle("Choisir un fichier Google Drive")
        .addView(new picker.DocsView())
        .setCallback((data: PickerResult) => {
          if (data.action === picker.Action.PICKED) {
            const docs = (data.docs ?? []).map((d) => ({
              id: d.id,
              name: d.name,
              url: d.url ?? `https://drive.google.com/file/d/${d.id}/view`,
              mimeType: d.mimeType ?? null,
              sizeBytes: typeof d.sizeBytes === "number" ? d.sizeBytes : null,
            }));
            resolve(docs);
          } else if (data.action === picker.Action.CANCEL) {
            resolve([]);
          }
        });
      builder.build().setVisible(true);
    } catch (e) {
      reject(e instanceof Error ? e : new Error("Picker error"));
    }
  });
}
