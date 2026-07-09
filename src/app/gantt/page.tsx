"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTasks } from "@/lib/store";
import type { Task } from "@/lib/types";

const DAY_W = 28; // 1日あたりの幅(px)
const ROW_H = 40;
const LEFT_W = 220;

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}
function addDaysIso(iso: string, n: number): string {
  const d = toDate(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function dayDiff(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);
}

/** タスクの [開始, 終了]（YYYY-MM-DD）。日付が無ければ null。 */
function taskRange(t: Task): [string, string] | null {
  const s = t.startDate ?? t.dueDate;
  const e = t.dueDate ?? t.startDate;
  if (!s || !e) return null;
  return s <= e ? [s, e] : [e, s];
}

interface Row {
  task: Task;
  depth: number;
  range: [string, string] | null;
}

const BAR_COLOR: Record<string, string> = {
  todo: "bg-slate-500",
  "in-progress": "bg-brand-500",
  done: "bg-emerald-500",
};

export default function GanttPage() {
  const { tasks, ready } = useTasks();

  const model = useMemo(() => {
    const byId = new Map(tasks.map((t) => [t.id, t]));
    const isTop = (t: Task) => !t.parentId || !byId.has(t.parentId);
    const parents = tasks.filter(isTop);
    const childrenOf = (id: string) => tasks.filter((t) => t.parentId === id);

    // 親の実効レンジ（自分＋子の最小開始〜最大終了）。
    const effectiveRange = (t: Task): [string, string] | null => {
      const ranges = [taskRange(t), ...childrenOf(t.id).map(taskRange)].filter(
        (r): r is [string, string] => r !== null,
      );
      if (ranges.length === 0) return null;
      const start = ranges.reduce((m, r) => (r[0] < m ? r[0] : m), ranges[0][0]);
      const end = ranges.reduce((m, r) => (r[1] > m ? r[1] : m), ranges[0][1]);
      return [start, end];
    };

    const rows: Row[] = [];
    for (const p of parents) {
      rows.push({ task: p, depth: 0, range: effectiveRange(p) });
      for (const c of childrenOf(p.id)) {
        rows.push({ task: c, depth: 1, range: taskRange(c) });
      }
    }

    // 全体レンジ。
    const all = rows.map((r) => r.range).filter((r): r is [string, string] => !!r);
    if (all.length === 0) return { rows, rangeStart: null, totalDays: 0 };
    let min = all[0][0];
    let max = all[0][1];
    for (const [s, e] of all) {
      if (s < min) min = s;
      if (e > max) max = e;
    }
    const rangeStart = addDaysIso(min, -2);
    const rangeEnd = addDaysIso(max, 2);
    const totalDays = dayDiff(rangeStart, rangeEnd) + 1;
    return { rows, rangeStart, totalDays };
  }, [tasks]);

  const todayIso = new Date().toISOString().slice(0, 10);

  if (!ready) return <p className="text-sm text-slate-500">読み込み中...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Gantt</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">ガントチャート</h1>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-wider text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-slate-500" />未着手
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-brand-500" />進行中
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-emerald-500" />完了
          </span>
        </div>
      </div>

      {model.rows.length === 0 ? (
        <p className="card p-10 text-center text-sm text-slate-500">
          タスクがありません。
          <Link href="/tasks?new=1" className="ml-1 text-brand-400 hover:underline">
            追加する
          </Link>
        </p>
      ) : model.rangeStart === null ? (
        <p className="card p-10 text-center text-sm text-slate-500">
          日付（開始日・締切）が設定されたタスクがありません。タスクに開始日と締切を設定すると帯が表示されます。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <div style={{ width: LEFT_W + model.totalDays * DAY_W }}>
            {/* ヘッダー（日付軸） */}
            <TimelineHeader
              rangeStart={model.rangeStart}
              totalDays={model.totalDays}
              todayIso={todayIso}
            />
            {/* 行 */}
            {model.rows.map((row) => (
              <GanttRow
                key={row.task.id}
                row={row}
                rangeStart={model.rangeStart!}
                totalDays={model.totalDays}
                todayIso={todayIso}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineHeader({
  rangeStart,
  totalDays,
  todayIso,
}: {
  rangeStart: string;
  totalDays: number;
  todayIso: string;
}) {
  const days = Array.from({ length: totalDays }, (_, i) => addDaysIso(rangeStart, i));
  return (
    <div className="flex border-b border-slate-800 bg-slate-900">
      <div
        className="sticky left-0 z-20 shrink-0 border-r border-slate-800 bg-slate-900 px-3 py-2"
        style={{ width: LEFT_W }}
      >
        <span className="eyebrow">タスク</span>
      </div>
      <div className="flex">
        {days.map((iso) => {
          const d = toDate(iso);
          const dow = d.getDay();
          const isMonthStart = d.getDate() === 1;
          const isToday = iso === todayIso;
          return (
            <div
              key={iso}
              className={`shrink-0 border-r border-slate-800/60 py-1 text-center ${
                dow === 0 || dow === 6 ? "bg-slate-800/40" : ""
              }`}
              style={{ width: DAY_W }}
            >
              <div className="font-mono text-[9px] leading-tight text-slate-500">
                {isMonthStart ? `${d.getMonth() + 1}月` : ""}
              </div>
              <div
                className={`font-mono text-[11px] leading-tight ${
                  isToday ? "font-bold text-brand-400" : "text-slate-300"
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GanttRow({
  row,
  rangeStart,
  totalDays,
  todayIso,
}: {
  row: Row;
  rangeStart: string;
  totalDays: number;
  todayIso: string;
}) {
  const { task, depth, range } = row;
  const isParent = depth === 0;
  const todayOffset = dayDiff(rangeStart, todayIso);
  const showToday = todayOffset >= 0 && todayOffset < totalDays;

  let bar: { left: number; width: number } | null = null;
  if (range) {
    const left = dayDiff(rangeStart, range[0]) * DAY_W;
    const width = (dayDiff(range[0], range[1]) + 1) * DAY_W;
    bar = { left, width };
  }

  return (
    <div className="flex border-b border-slate-800/60 last:border-b-0" style={{ height: ROW_H }}>
      {/* 左：タスク名 */}
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-slate-800 bg-slate-900 px-3"
        style={{ width: LEFT_W }}
      >
        {!isParent && <span className="text-slate-600">└</span>}
        <span
          className={`truncate text-sm ${
            isParent ? "font-semibold text-white" : "text-slate-300"
          }`}
          title={task.title}
        >
          {task.title}
        </span>
      </div>

      {/* 右：タイムライン */}
      <div className="relative" style={{ width: totalDays * DAY_W }}>
        {showToday && (
          <div
            className="pointer-events-none absolute top-0 z-0 h-full w-px bg-brand-500/40"
            style={{ left: todayOffset * DAY_W + DAY_W / 2 }}
          />
        )}
        {bar ? (
          <div
            className={`absolute top-1/2 flex -translate-y-1/2 items-center rounded ${
              isParent
                ? "h-2.5 bg-slate-600 ring-1 ring-inset ring-slate-500"
                : `h-5 ${BAR_COLOR[task.status] ?? "bg-slate-500"}`
            } ${task.status === "done" && !isParent ? "opacity-70" : ""}`}
            style={{ left: bar.left + 1, width: Math.max(bar.width - 2, 6) }}
            title={`${range![0]} 〜 ${range![1]}`}
          >
            {!isParent && bar.width > 60 && (
              <span className="truncate px-1.5 font-mono text-[10px] text-white/90">
                {task.title}
              </span>
            )}
          </div>
        ) : (
          <span
            className="absolute top-1/2 -translate-y-1/2 px-2 font-mono text-[10px] text-slate-600"
            style={{ left: 0 }}
          >
            日付未設定
          </span>
        )}
      </div>
    </div>
  );
}
