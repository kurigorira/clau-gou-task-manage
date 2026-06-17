"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGoogle } from "@/lib/google";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { href: "/", label: "ホーム" },
  { href: "/tasks", label: "タスク" },
  { href: "/calendar", label: "カレンダー" },
  { href: "/stats", label: "進捗" },
  { href: "/knowledge", label: "ナレッジ" },
  { href: "/settings", label: "設定" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { isConnected } = useGoogle();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            T
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Taskful
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/settings"
            title={isConnected ? "Google連携: 接続済み" : "Google連携: 未接続"}
            className={`ml-1 hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${
              isConnected
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isConnected ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            Google
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
