"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGoogle } from "@/lib/google";

const NAV = [
  { href: "/", label: "ホーム" },
  { href: "/tasks", label: "タスク" },
  { href: "/gantt", label: "ガント" },
  { href: "/calendar", label: "カレンダー" },
  { href: "/stats", label: "統計" },
  { href: "/knowledge", label: "ナレッジ" },
  { href: "/settings", label: "設定" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { isConnected } = useGoogle();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const pill = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-brand-600 text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-base font-bold text-white shadow-sm">
              A
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Atlas Lite
            </span>
          </Link>

          {/* PC: 1段目にナビ */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={pill(isActive(item.href))}>
                {item.label}
              </Link>
            ))}
            <Link
              href="/settings"
              title={isConnected ? "Google連携: 接続済み" : "Google連携: 未接続"}
              className="ml-2 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: isConnected ? "#22c55e" : "#cbd5e1" }}
            />
          </nav>
        </div>

        {/* スマホ: 2段目に横スクロールナビ（全ページに届く・大きめタップ領域） */}
        <nav className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2.5 md:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={pill(isActive(item.href))}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
