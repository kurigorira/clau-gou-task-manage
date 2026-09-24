"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTasks } from "@/lib/store";
import { formatJaDate, daysUntil } from "@/lib/date";
import { WeatherWidget } from "@/components/WeatherWidget";
import { NewsWidget } from "@/components/NewsWidget";
import { DriveWidget } from "@/components/DriveWidget";
import { FavoritesWidget } from "@/components/FavoritesWidget";
import { MiniCalendar } from "@/components/MiniCalendar";
import { UpcomingEvents } from "@/components/UpcomingEvents";

const DOW = ["日", "月", "火", "水", "木", "金", "土"];

function greeting(hour: number): string {
  if (hour < 5) return "こんばんは";
  if (hour < 11) return "おはようございます";
  if (hour < 18) return "こんにちは";
  return "こんばんは";
}

export default function HomePage() {
  const { tasks, ready } = useTasks();

  // 日時はブラウザ側で確定させる（静的書き出し時の時刻を表示しないため）。
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");
  const dueToday = open.filter((t) => daysUntil(t.dueDate) === 0).length;
  const overdue = open.filter((t) => {
    const d = daysUntil(t.dueDate);
    return d !== null && d < 0;
  }).length;
  const completionRate =
    tasks.length === 0 ? 0 : Math.round((done.length / tasks.length) * 100);

  const upcoming = [...open]
    .filter((t) => t.dueDate)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
    .slice(0, 4);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* あいさつ */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {now ? `${now.getMonth() + 1}月${now.getDate()}日（${DOW[now.getDay()]}）` : " "}
          </p>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {now ? greeting(now.getHours()) : " "}
          </h1>
        </div>
        <Link
          href="/tasks?new=1"
          className="shrink-0 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          ＋ タスク
        </Link>
      </div>

      {/* 数字 */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <Stat label="未完了" value={ready ? open.length : "–"} tone="text-slate-900" />
        <Stat
          label="今日締切"
          value={ready ? dueToday : "–"}
          tone={dueToday > 0 ? "text-amber-600" : "text-slate-900"}
        />
        <Stat
          label="超過"
          value={ready ? overdue : "–"}
          tone={overdue > 0 ? "text-rose-600" : "text-slate-900"}
        />
        <Stat label="完了率" value={ready ? `${completionRate}%` : "–"} tone="text-brand-600" />
      </div>

      {/* カード */}
      <div className="grid items-start gap-3 sm:gap-4 lg:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">⏰ 締切間近</h2>
            <Link href="/tasks" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              すべて →
            </Link>
          </div>
          {!ready ? null : upcoming.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">なし</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {upcoming.map((task) => {
                const d = daysUntil(task.dueDate);
                return (
                  <li key={task.id}>
                    <Link
                      href="/tasks"
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                        {task.title}
                      </span>
                      <span
                        className={`shrink-0 text-xs font-semibold ${
                          d === null
                            ? "text-slate-400"
                            : d < 0
                              ? "text-rose-600"
                              : d <= 2
                                ? "text-amber-600"
                                : "text-slate-400"
                        }`}
                      >
                        {d === null
                          ? formatJaDate(task.dueDate)
                          : d < 0
                            ? `${-d}日超過`
                            : d === 0
                              ? "今日"
                              : `あと${d}日`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <WeatherWidget />
        <MiniCalendar />
        <UpcomingEvents />
        <NewsWidget />
        <FavoritesWidget />
        <DriveWidget />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className="card px-2 py-3 text-center sm:py-4">
      <p className={`text-xl font-bold tracking-tight sm:text-2xl ${tone}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">{label}</p>
    </div>
  );
}
