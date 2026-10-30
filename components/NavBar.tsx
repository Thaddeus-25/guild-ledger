"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import styles from "./NavBar.module.css";

const TABS = [
  { href: "/", label: "Guild Hall" },
  { href: "/ledger", label: "Ledger" },
  { href: "/pouches", label: "Coin Pouches" },
  { href: "/hearth", label: "Hearth" },
];

export default function NavBar() {
  // The current address, e.g. "/ledger" or "/ledger/new".
  const pathname = usePathname();
  const { status } = useAuth();

  // Nothing to visit until you've logged in through the Guild Gate.
  if (status !== "signed-in") return null;

  return (
    <nav className={styles.nav} aria-label="Main">
      <span className={styles.brand}>Guild Ledger</span>
      <ul className={styles.tabs}>
        {TABS.map((tab) => {
          // "/" would match every address, so it must match exactly.
          // The others also count sub-pages, so "/ledger/new" lights up "Ledger".
          const isActive =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={styles.tab}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
