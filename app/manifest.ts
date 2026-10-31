import type { MetadataRoute } from "next";

// The web app manifest: tells phones how to open Guild Ledger from the
// home screen. Next.js serves this at /manifest.webmanifest and links it
// from every page automatically.
//
// display: "standalone" is what removes the browser's address bar. It does
// NOT make the app work offline; that needs a service worker (planned).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Guild Ledger",
    short_name: "Guild Ledger",
    description: "A cozy budgeting ledger for adventurers.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // The night-blue page background, so the splash screen matches the app.
    background_color: "#1f2a44",
    theme_color: "#1f2a44",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops this one to its own icon shape (circle, squircle…),
      // so the coin sits well inside a night-blue square.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
