"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTasks } from "@/lib/store";
import { useGoogle } from "@/lib/google";
import { listEvents, eventStartDate, type GoogleCalendarEvent } from "@/lib/calendarApi";
import type { Task } from "@/lib/types";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function monthRange(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${year}-${pad(month + 1)}-01`;
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const end = `${nextYear}-${pad(nextMonth + 1)}-01`;
  return { start, end };
}

export default function CalendarPage() {
  const { tasks, ready } = useTasks();
  const { isConnected, accessToken } = useGoogle();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  // 連携中は、表示中の月のGoogleカレンダー予定を取得する。
  useEffect(() => {
    if (!isConnected || !accessToken) {
      setGoogleEvents([]);
      return;
    }
    let cancelled = false;
    const { start, end } = monthRange(cursor.year, cursor.month);
    setLoadingEvents(true);
    setEventsError(null);
    listEvents(accessToken, start, end)
      .then((items) => {
        if (!cancelled) setGoogleEvents(items);
      })
      .catch((e) => {
        if (!cancelled) setEventsError(e instanceof Error ? e.message : "取得に失敗しました");
      })
      .finally(() => {
        if (!cancelled) setLoadingEvents(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isConnected, accessToken, cursor]);

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

  const googleByDate = useMemo(() => {
    const map = new Map<string, GoogleCalendarEvent[]>();
    for (const ev of googleEvents) {
      const date = eventStartDate(ev);
      if (!date) continue;
      const list = map.get(date) ?? [];
      list.push(ev);
      map.set(date, list);
    }
    return map;
  }, [googleEvents]);

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

      {isConnected ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded bg-brand-400" />
            タスクの締切
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded bg-emerald-400" />
            Googleカレンダーの予定
          </span>
          {loadingEvents && <span className="text-xs text-slate-400">予定を読み込み中...</span>}
          {eventsError && <span className="text-xs text-rose-600">{eventsError}</span>}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          表示中はタスクの締切のみです。
          <Link href="/settings" className="font-medium underline">
            設定でGoogle連携
          </Link>
          すると、カレンダーの予定もここに表示されます。
        </div>
      )}

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
            const dayEvents = cell.iso ? (googleByDate.get(cell.iso) ?? []) : [];
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
                        dayTasks.slice(0, 2).map((t) => (
                          <div
                            key={t.id}
                            title={t.title}
                            className="truncate rounded bg-brand-50 px-1 py-0.5 text-[11px] text-brand-700"
                          >
                            {t.title}
                          </div>
                        ))}
                      {dayTasks.length > 2 && (
                        <div className="text-[11px] text-slate-400">他{dayTasks.length - 2}件</div>
                      )}
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          title={ev.summary ?? "(無題)"}
                          className="truncate rounded bg-emerald-50 px-1 py-0.5 text-[11px] text-emerald-700"
                        >
                          {ev.summary ?? "(無題)"}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[11px] text-slate-400">予定+{dayEvents.length - 2}</div>
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
