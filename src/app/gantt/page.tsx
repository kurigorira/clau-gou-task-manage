"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTasks } from "@/lib/store";
import type { Task } from "@/lib/types";

const DAY_W = 28; // 1日あたりの幅(px)

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
  todo: "bg-slate-300",
  "in-progress": "bg-brand-500",
  done: "bg-emerald-400",
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">ガントチャート</h1>
          <p className="mt-1 text-sm text-slate-500">
            大項目と小項目のスケジュールをひと目で確認できます。
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-slate-300" />
            未着手
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-brand-500" />
            進行中
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-emerald-400" />
            完了
          </span>
        </div>
      </div>

      {model.rows.length === 0 ? (
        <p className="card border-dashed p-10 text-center text-sm text-slate-500">
          タスクがありません。
          <Link href="/tasks?new=1" className="ml-1 font-medium text-brand-600 hover:underline">
            追加する
          </Link>
        </p>
      ) : model.rangeStart === null ? (
        <p className="card border-dashed p-10 text-center text-sm text-slate-500">
          日付（開始日・締切）が設定されたタスクがありません。タスクに日付を設定すると帯が表示されます。
        </p>
      ) : (
        <div className="card overflow-x-auto">
          <div className="min-w-max">
            <TimelineHeader
              rangeStart={model.rangeStart}
              totalDays={model.totalDays}
              todayIso={todayIso}
            />
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

      <p className="text-xs text-slate-400 sm:hidden">
        ← 左右にスワイプすると日付をスクロールできます
      </p>
    </div>
  );
}

/** 左列（タスク名）。スマホでは狭く、PCでは広く。 */
const LEFT_COL = "w-[136px] sm:w-[220px]";

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
    <div className="flex border-b border-slate-200 bg-slate-50">
      <div
        className={`sticky left-0 z-20 shrink-0 border-r border-slate-200 bg-slate-50 px-3 py-2 ${LEFT_COL}`}
      >
        <span className="text-xs font-semibold text-slate-500">タスク</span>
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
              className={`shrink-0 py-1 text-center ${
                dow === 0 || dow === 6 ? "bg-slate-100/80" : ""
              }`}
              style={{ width: DAY_W }}
            >
              <div className="text-[9px] leading-tight text-slate-400">
                {isMonthStart ? `${d.getMonth() + 1}月` : ""}
              </div>
              <div
                className={`text-[11px] leading-tight ${
                  isToday
                    ? "mx-auto w-5 rounded-full bg-brand-600 font-bold text-white"
                    : dow === 0
                      ? "text-rose-400"
                      : "text-slate-600"
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
    <div className="flex h-10 border-b border-slate-100 last:border-b-0">
      {/* 左：タスク名 */}
      <div
        className={`sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-r border-slate-200 bg-white px-3 ${LEFT_COL}`}
      >
        {!isParent && <span className="text-slate-300">└</span>}
        <span
          className={`truncate text-sm ${
            isParent ? "font-semibold text-slate-900" : "text-slate-600"
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
            className="pointer-events-none absolute top-0 z-0 h-full w-px bg-brand-400/60"
            style={{ left: todayOffset * DAY_W + DAY_W / 2 }}
          />
        )}
        {bar ? (
          <div
            className={`absolute top-1/2 flex -translate-y-1/2 items-center rounded-full ${
              isParent
                ? "h-2 bg-slate-400/70"
                : `h-5 shadow-sm ${BAR_COLOR[task.status] ?? "bg-slate-300"}`
            }`}
            style={{ left: bar.left + 2, width: Math.max(bar.width - 4, 8) }}
            title={`${range![0]} 〜 ${range![1]}`}
          >
            {!isParent && bar.width > 64 && (
              <span
                className={`truncate px-2 text-[10px] font-medium ${
                  task.status === "todo" ? "text-slate-600" : "text-white"
                }`}
              >
                {task.title}
              </span>
            )}
          </div>
        ) : (
          <span className="absolute top-1/2 -translate-y-1/2 px-2 text-[10px] text-slate-300">
            日付未設定
          </span>
        )}
      </div>
    </div>
  );
}
