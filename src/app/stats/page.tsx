"use client";

import { useMemo } from "react";
import { useTasks } from "@/lib/store";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  STATUS_ORDER,
  type TaskPriority,
} from "@/lib/types";
import { daysUntil } from "@/lib/date";

export default function StatsPage() {
  const { tasks, ready } = useTasks();

  const stats = useMemo(() => {
    const total = tasks.length;
    const byStatus = STATUS_ORDER.map((s) => ({
      key: s,
      label: STATUS_LABEL[s],
      count: tasks.filter((t) => t.status === s).length,
    }));
    const priorities: TaskPriority[] = ["high", "medium", "low"];
    const byPriority = priorities.map((p) => ({
      key: p,
      label: PRIORITY_LABEL[p],
      count: tasks.filter((t) => t.priority === p).length,
    }));
    const done = tasks.filter((t) => t.status === "done").length;
    const completion = total === 0 ? 0 : Math.round((done / total) * 100);

    const open = tasks.filter((t) => t.status !== "done");
    let overdue = 0;
    let today = 0;
    let week = 0;
    for (const t of open) {
      const d = daysUntil(t.dueDate);
      if (d === null) continue;
      if (d < 0) overdue++;
      else if (d === 0) today++;
      else if (d <= 7) week++;
    }

    // タグ別集計（上位）。
    const tagCount = new Map<string, number>();
    for (const t of tasks) {
      for (const tag of t.tags) tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
    }
    const topTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    return { total, byStatus, byPriority, completion, overdue, today, week, topTags };
  }, [tasks]);

  if (!ready) {
    return <p className="text-sm text-slate-500">読み込み中...</p>;
  }

  const statusColors: Record<string, string> = {
    todo: "bg-slate-400",
    "in-progress": "bg-blue-500",
    done: "bg-emerald-500",
  };
  const priorityColors: Record<string, string> = {
    high: "bg-rose-500",
    medium: "bg-amber-500",
    low: "bg-slate-400",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">進捗ダッシュボード</h1>
        <p className="mt-1 text-sm text-slate-500">タスクの状況をまとめて確認できます。</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* 完了率リング */}
        <div className="flex items-center gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Ring percent={stats.completion} />
          <div>
            <p className="text-sm text-slate-500">完了率</p>
            <p className="text-3xl font-bold text-slate-900">{stats.completion}%</p>
            <p className="mt-1 text-sm text-slate-500">全 {stats.total} 件</p>
          </div>
        </div>

        {/* 締切サマリー */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-3 text-sm font-medium text-slate-700">締切（未完了タスク）</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <DueStat label="超過" value={stats.overdue} accent="text-rose-600" />
            <DueStat label="今日" value={stats.today} accent="text-amber-600" />
            <DueStat label="7日以内" value={stats.week} accent="text-slate-700" />
          </div>
        </div>
      </div>

      {/* 状態別 */}
      <BarSection title="状態別" rows={stats.byStatus} total={stats.total} colors={statusColors} />

      {/* 優先度別 */}
      <BarSection
        title="優先度別"
        rows={stats.byPriority}
        total={stats.total}
        colors={priorityColors}
      />

      {/* タグ別 */}
      {stats.topTags.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">タグ別（上位）</h2>
          <div className="flex flex-wrap gap-2">
            {stats.topTags.map(([tag, count]) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200"
              >
                #{tag}
                <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-500">
                  {count}
                </span>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Ring({ percent }: { percent: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className="shrink-0">
      <circle cx="48" cy="48" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
      <circle
        cx="48"
        cy="48"
        r={r}
        fill="none"
        stroke="#4f46e5"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 48 48)"
      />
    </svg>
  );
}

function DueStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function BarSection({
  title,
  rows,
  total,
  colors,
}: {
  title: string;
  rows: { key: string; label: string; count: number }[];
  total: number;
  colors: Record<string, string>;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {rows.map((row) => {
          const pct = total === 0 ? 0 : Math.round((row.count / total) * 100);
          return (
            <div key={row.key} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-sm text-slate-600">{row.label}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${colors[row.key] ?? "bg-slate-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-sm text-slate-500">
                {row.count}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
