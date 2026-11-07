"use client";

// Last-resort boundary when the root layout itself fails. Inline styles only.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#12201B", color: "#F4EFE6", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 32, margin: 0 }}>TasteHeist hit a snag</h1>
          <p style={{ color: "#B8C5BD" }}>Please try again in a moment.</p>
          <button type="button" onClick={reset} style={{ minHeight: 52, padding: "0 24px", borderRadius: 16, border: 0, background: "#FF5A36", color: "#12201B", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
