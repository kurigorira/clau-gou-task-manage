"use client";

/**
 * トップページ用のミニカレンダー。今月の日付に、
 * タスク締切（青）・会社行事（オレンジ）・プライベート（ピンク）のドットを表示する。
 */

import Link from "next/link";
import { useMemo } from "react";
import { useTasks } from "@/lib/store";
import { useEvents } from "@/lib/events";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function MiniCalendar() {
  const { tasks } = useTasks();
  const { events } = useEvents();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayIso = now.toISOString().slice(0, 10);

  const cells = useMemo(() => {
    const startWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const list: { day: number | null; iso: string | null }[] = [];
    for (let i = 0; i < startWeekday; i++) list.push({ day: null, iso: null });
    for (let d = 1; d <= daysInMonth; d++) {
      list.push({
        day: d,
        iso: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }
    while (list.length % 7 !== 0) list.push({ day: null, iso: null });
    return list;
  }, [year, month]);

  const dots = useMemo(() => {
    const map = new Map<string, { task: boolean; company: boolean; priv: boolean }>();
    const get = (iso: string) => {
      const v = map.get(iso) ?? { task: false, company: false, priv: false };
      map.set(iso, v);
      return v;
    };
    for (const t of tasks) {
      if (t.dueDate && t.status !== "done") get(t.dueDate).task = true;
    }
    for (const e of events) {
      if (e.category === "company") get(e.date).company = true;
      else get(e.date).priv = true;
    }
    return map;
  }, [tasks, events]);

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900">
          🗓 {month + 1}月のカレンダー
        </h2>
        <Link href="/calendar" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          詳しく →
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`pb-1 text-[11px] font-semibold ${
              i === 0 ? "text-rose-400" : i === 6 ? "text-blue-400" : "text-slate-400"
            }`}
          >
            {w}
          </div>
        ))}
        {cells.map((cell, i) => {
          const d = cell.iso ? dots.get(cell.iso) : undefined;
          const isToday = cell.iso === todayIso;
          return (
            <div key={i} className="flex flex-col items-center py-1">
              {cell.day && (
                <>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isToday ? "bg-brand-600 font-bold text-white" : "text-slate-600"
                    }`}
                  >
                    {cell.day}
                  </span>
                  <span className="mt-0.5 flex h-1.5 gap-0.5">
                    {d?.task && <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />}
                    {d?.company && <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />}
                    {d?.priv && <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
          締切
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
          会社
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
          プライベート
        </span>
      </div>
    </section>
  );
}
