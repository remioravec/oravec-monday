"use client";

import { useEffect } from "react";

/**
 * Garde-fou racine : capture les erreurs non interceptées par les boundaries
 * de segment (ex. erreurs au niveau du layout /app), et affiche le détail réel
 * au lieu du message générique de Next.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[root error boundary]", error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 560, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            Une erreur est survenue
          </h1>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 13,
              background: "#fff",
              border: "1px solid #e6e8eb",
              borderRadius: 12,
              padding: 14,
              textAlign: "left",
              color: "#b91c1c",
            }}
          >
            {error?.message || "Erreur inconnue"}
            {error?.digest ? `\n\n(réf : ${error.digest})` : ""}
          </pre>
          <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                height: 44,
                padding: "0 20px",
                borderRadius: 12,
                border: "none",
                background: "#1a73e8",
                color: "#fff",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Réessayer
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                height: 44,
                padding: "0 20px",
                borderRadius: 12,
                border: "1px solid #e6e8eb",
                background: "#fff",
                color: "#0f172a",
                cursor: "pointer",
              }}
            >
              Accueil
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
