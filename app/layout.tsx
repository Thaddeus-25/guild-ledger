import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Pixelify_Sans } from "next/font/google";
import LedgerGate from "@/components/LedgerGate";
import NavBar from "@/components/NavBar";
import { LedgerProvider } from "@/lib/LedgerContext";
import "./globals.css";

// Pixel font for headings and tabs.
const pixelFont = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin"],
});

// Very readable font for body text and every amount of money.
const bodyFont = Atkinson_Hyperlegible_Next({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Guild Ledger",
  description: "A cozy budgeting ledger for adventurers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${pixelFont.variable} ${bodyFont.variable}`}>
      <body>
        <LedgerProvider>
          <NavBar />
          <main className="page">
            <LedgerGate>{children}</LedgerGate>
          </main>
        </LedgerProvider>
      </body>
    </html>
  );
}
