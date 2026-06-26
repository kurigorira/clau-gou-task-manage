"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGoogle } from "@/lib/google";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/tasks", label: "Tasks" },
  { href: "/calendar", label: "Calendar" },
  { href: "/stats", label: "Stats" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/settings", label: "Settings" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { isConnected } = useGoogle();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-brand-600 text-sm font-bold text-white">
            A
          </span>
          <span className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-white">
            Atlas Lite
          </span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative rounded px-3 py-2 font-mono text-[11px] uppercase tracking-[0.15em] transition-colors ${
                isActive(item.href)
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-200"
              }`}
            >
              {item.label}
              {isActive(item.href) && (
                <span className="absolute inset-x-3 -bottom-px h-px bg-brand-500" />
              )}
            </Link>
          ))}
          <Link
            href="/settings"
            title={isConnected ? "Google連携: 接続済み" : "Google連携: 未接続"}
            className="ml-2 hidden h-2 w-2 rounded-full sm:block"
            style={{ backgroundColor: isConnected ? "#22c55e" : "#46464e" }}
          />
        </nav>
      </div>
    </header>
  );
}
