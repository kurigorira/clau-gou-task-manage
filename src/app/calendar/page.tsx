"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTasks } from "@/lib/store";
import { useGoogle } from "@/lib/google";
import { listEvents, eventStartDate, type GoogleCalendarEvent } from "@/lib/calendarApi";
import {
  useEvents,
  parseIcs,
  CATEGORY_LABEL,
  type CalEvent,
  type EventCategory,
} from "@/lib/events";
import type { Task } from "@/lib/types";

/** 行事カテゴリの表示色。 */
const CATEGORY_CHIP: Record<EventCategory, string> = {
  company: "bg-orange-100 text-orange-700",
  private: "bg-pink-100 text-pink-700",
};

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
  const { events: localEvents } = useEvents();
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

  const localByDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const ev of localEvents) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [localEvents]);

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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <span className="h-2.5 w-2.5 rounded bg-brand-400" />
          タスクの締切
        </span>
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <span className="h-2.5 w-2.5 rounded bg-orange-400" />
          会社の行事
        </span>
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <span className="h-2.5 w-2.5 rounded bg-pink-400" />
          プライベート
        </span>
        {isConnected ? (
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded bg-emerald-400" />
            Googleカレンダー
          </span>
        ) : (
          <span className="text-xs text-slate-400">
            <Link href="/settings" className="font-medium text-brand-600 hover:underline">
              ログイン
            </Link>
            するとGoogleカレンダーの予定も表示されます
          </span>
        )}
        {loadingEvents && <span className="text-xs text-slate-400">予定を読み込み中...</span>}
        {eventsError && <span className="text-xs text-rose-600">{eventsError}</span>}
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
            const dayEvents = cell.iso ? (googleByDate.get(cell.iso) ?? []) : [];
            const dayLocal = cell.iso ? (localByDate.get(cell.iso) ?? []) : [];
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
                      {dayLocal.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          title={`${CATEGORY_LABEL[ev.category]}: ${ev.title}`}
                          className={`truncate rounded px-1 py-0.5 text-[11px] ${CATEGORY_CHIP[ev.category]}`}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayLocal.length > 2 && (
                        <div className="text-[11px] text-slate-400">行事+{dayLocal.length - 2}</div>
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

      <EventManager year={cursor.year} month={cursor.month} />
    </div>
  );
}

/** 行事予定（会社・プライベート）の追加・ICS取り込み・削除。 */
function EventManager({ year, month }: { year: number; month: number }) {
  const { events, ready, addEvent, deleteEvent, clearCategory, importEvents } = useEvents();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<EventCategory>("company");
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  const monthEvents = events
    .filter((e) => e.date.startsWith(monthPrefix))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    addEvent({ title: title.trim(), date, category });
    setTitle("");
    setMessage(null);
  };

  const handleIcs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseIcs(String(reader.result ?? ""));
        if (parsed.length === 0) {
          setMessage("予定が見つかりませんでした。ICS形式のファイルかご確認ください。");
          return;
        }
        const { added, skipped } = importEvents(
          parsed.map((p) => ({ ...p, category })),
        );
        setMessage(
          `${CATEGORY_LABEL[category]}の行事として ${added}件 取り込みました` +
            (skipped > 0 ? `（重複 ${skipped}件 はスキップ）` : "") +
            "。",
        );
      } catch {
        setMessage("ファイルを読み込めませんでした。");
      }
    };
    reader.readAsText(file);
  };

  const handleClear = (c: EventCategory) => {
    const count = events.filter((e) => e.category === c).length;
    if (count === 0) return;
    if (window.confirm(`${CATEGORY_LABEL[c]}の行事 ${count}件 をすべて削除しますか？`)) {
      clearCategory(c);
      setMessage(`${CATEGORY_LABEL[c]}の行事を削除しました。`);
    }
  };

  return (
    <section className="card p-4 sm:p-6">
      <h2 className="font-bold text-slate-900">行事予定の管理</h2>
      <p className="mt-1 text-sm text-slate-500">
        会社の年間行事はICSファイルからまとめて取り込めます（再取り込みしても重複しません）。
        プライベートの予定は下のフォームから追加できます。
      </p>

      {/* 追加フォーム */}
      <form onSubmit={handleAdd} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as EventCategory)}
          className="input sm:w-36"
        >
          <option value="company">会社</option>
          <option value="private">プライベート</option>
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input sm:w-44"
          required
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 全社会議 / 家族旅行"
          className="input sm:flex-1"
          required
        />
        <button
          type="submit"
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          追加
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          📥 ICS取り込み
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".ics,text/calendar"
          onChange={handleIcs}
          className="hidden"
        />
      </form>

      {message && <p className="mt-2 text-sm text-emerald-600">{message}</p>}

      {/* 表示中の月の行事一覧 */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-slate-700">
          {month + 1}月の行事（{monthEvents.length}件）
        </h3>
        {!ready ? null : monthEvents.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">この月の行事はありません。</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {monthEvents.map((ev) => (
              <li key={ev.id} className="flex items-center gap-2.5 py-2">
                <span className="w-14 shrink-0 text-sm font-medium text-slate-500">
                  {Number(ev.date.slice(8, 10))}日
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${CATEGORY_CHIP[ev.category]}`}
                >
                  {CATEGORY_LABEL[ev.category]}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{ev.title}</span>
                <button
                  onClick={() => deleteEvent(ev.id)}
                  className="shrink-0 rounded-full px-2 py-1 text-slate-300 hover:text-rose-600"
                  aria-label="削除"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 一括削除 */}
      <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-xs">
        <button onClick={() => handleClear("company")} className="text-slate-400 hover:text-rose-600">
          会社の行事を全削除
        </button>
        <button onClick={() => handleClear("private")} className="text-slate-400 hover:text-rose-600">
          プライベートを全削除
        </button>
      </div>
    </section>
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
