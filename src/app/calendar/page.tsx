"use client";

import { useMemo, useState } from "react";
import { useTasks } from "@/lib/store";
import type { Task } from "@/lib/types";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function CalendarPage() {
  const { tasks, ready } = useTasks();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const list = map.get(t.dueDate) ?? [];
      list.push(t);
      map.set(t.dueDate, list);
    }
    return map;
  }, [tasks]);

  const cells = useMemo(() => buildMonthCells(cursor.year, cursor.month), [cursor]);

  const prev = () =>
    setCursor((c) =>
      c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 },
    );
  const next = () =>
    setCursor((c) =>
      c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 },
    );

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">カレンダー</h1>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
            ‹
          </button>
          <span className="w-28 text-center text-sm font-semibold text-slate-700">
            {cursor.year}年{cursor.month + 1}月
          </span>
          <button onClick={next} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
            ›
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        ここに表示しているのはタスクの締切です。<strong>Googleカレンダーの予定との双方向同期は Phase 2 で対応予定</strong>です。
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`py-2 text-center text-xs font-semibold ${
                i === 0 ? "text-rose-500" : i === 6 ? "text-blue-500" : "text-slate-500"
              }`}
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const dayTasks = cell.iso ? (byDate.get(cell.iso) ?? []) : [];
            const isToday = cell.iso === todayIso;
            return (
              <div
                key={i}
                className={`min-h-[92px] border-b border-r border-slate-100 p-1.5 ${
                  cell.iso ? "" : "bg-slate-50/50"
                }`}
              >
                {cell.day && (
                  <>
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        isToday ? "bg-brand-600 font-semibold text-white" : "text-slate-600"
                      }`}
                    >
                      {cell.day}
                    </span>
                    <div className="mt-1 space-y-1">
                      {ready &&
                        dayTasks.slice(0, 3).map((t) => (
                          <div
                            key={t.id}
                            title={t.title}
                            className="truncate rounded bg-brand-50 px-1 py-0.5 text-[11px] text-brand-700"
                          >
                            {t.title}
                          </div>
                        ))}
                      {dayTasks.length > 3 && (
                        <div className="text-[11px] text-slate-400">他{dayTasks.length - 3}件</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function buildMonthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { day: number | null; iso: string | null }[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, iso: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, iso });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, iso: null });
  return cells;
}
