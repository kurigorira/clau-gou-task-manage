"use client";

/**
 * トップページ用の「今後の行事予定」ウィジェット。
 * 今日以降の行事（会社・プライベート）を近い順に表示する。
 */

import Link from "next/link";
import { useEvents, CATEGORY_LABEL, type EventCategory } from "@/lib/events";

const CHIP: Record<EventCategory, string> = {
  company: "bg-orange-100 text-orange-700",
  private: "bg-pink-100 text-pink-700",
};

const DOW = ["日", "月", "火", "水", "木", "金", "土"];

function fmt(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}(${DOW[d.getDay()]})`;
}

export function UpcomingEvents() {
  const { events, ready } = useEvents();
  const todayIso = new Date().toISOString().slice(0, 10);

  const upcoming = events
    .filter((e) => e.date >= todayIso)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(0, 6);

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900">📌 今後の行事予定</h2>
        <Link href="/calendar" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          追加・管理 →
        </Link>
      </div>

      {!ready ? (
        <p className="mt-3 text-sm text-slate-400">読み込み中...</p>
      ) : upcoming.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">
          予定はありません。
          <Link href="/calendar" className="ml-1 font-medium text-brand-600 hover:underline">
            カレンダー
          </Link>
          から会社・プライベートの行事を追加できます（ICS一括取り込み対応）。
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {upcoming.map((ev) => {
            const isToday = ev.date === todayIso;
            return (
              <li key={ev.id} className="flex items-center gap-2.5 py-2">
                <span
                  className={`w-16 shrink-0 text-sm font-semibold ${
                    isToday ? "text-brand-600" : "text-slate-500"
                  }`}
                >
                  {isToday ? "今日" : fmt(ev.date)}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${CHIP[ev.category]}`}
                >
                  {CATEGORY_LABEL[ev.category]}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{ev.title}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
