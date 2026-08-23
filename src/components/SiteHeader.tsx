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
  const { isConnected, connect, status, clientId, email, picture } = useGoogle();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const pill = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-brand-600 text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  // ログインボタン / ログイン中のアカウント表示（PC・スマホ共通で1段目右端）。
  const loginControl = isConnected ? (
    <Link
      href="/settings"
      title={email ? `${email} でログイン中` : "ログイン中"}
      className="flex shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-1 pr-3"
    >
      {picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={picture} alt="" width={26} height={26} className="rounded-full" />
      ) : (
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
          ✓
        </span>
      )}
      <span className="text-xs font-medium text-emerald-700">ログイン中</span>
    </Link>
  ) : clientId ? (
    <button
      onClick={connect}
      disabled={status === "connecting"}
      className="shrink-0 rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
    >
      {status === "connecting" ? "ログイン中..." : "ログイン"}
    </button>
  ) : (
    <Link
      href="/settings"
      className="shrink-0 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
    >
      ログイン設定
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-base font-bold text-white shadow-sm">
              A
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Atlas Lite
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* PC: 1段目にナビ */}
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className={pill(isActive(item.href))}>
                  {item.label}
                </Link>
              ))}
            </nav>
            {loginControl}
          </div>
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
