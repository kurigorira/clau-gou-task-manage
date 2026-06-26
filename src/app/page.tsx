"use client";

import Link from "next/link";
import { useTasks } from "@/lib/store";
import { formatJaDate, daysUntil } from "@/lib/date";
import { StatusBadge, PriorityBadge } from "@/components/badges";

export default function HomePage() {
  const { tasks, ready } = useTasks();

  const open = tasks.filter((t) => t.status !== "done");
  const inProgress = tasks.filter((t) => t.status === "in-progress");
  const done = tasks.filter((t) => t.status === "done");
  const completionRate =
    tasks.length === 0 ? 0 : Math.round((done.length / tasks.length) * 100);

  const upcoming = [...open]
    .filter((t) => t.dueDate)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
    .slice(0, 4);

  return (
    <div className="space-y-16">
      {/* ヒーロー */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 px-6 py-16 sm:px-12 sm:py-24">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative">
          <p className="eyebrow">Taskful — Task Operating System</p>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.04] tracking-tight text-white sm:text-6xl">
            やるべきことと、その
            <span className="text-brand-500">知識</span>を、
            <br className="hidden sm:block" />
            ひとつの場所で。
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400">
            タスクを管理しながら、各タスクに必要なスキル・技術・参考資料も一緒に整理。
            Googleカレンダー連携とAIアシストで、締切も知識も逃しません。
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/tasks"
              className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-500"
            >
              タスクを管理する →
            </Link>
            <Link
              href="/tasks?new=1"
              className="rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              + 新しいタスク
            </Link>
          </div>
        </div>
      </section>

      {/* サマリー */}
      <section>
        <p className="eyebrow mb-5">Overview</p>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800 sm:grid-cols-4">
          <StatCell label="未完了" value={ready ? open.length : "–"} accent="text-white" />
          <StatCell label="進行中" value={ready ? inProgress.length : "–"} accent="text-brand-400" />
          <StatCell label="完了" value={ready ? done.length : "–"} accent="text-emerald-400" />
          <StatCell label="完了率" value={ready ? `${completionRate}%` : "–"} accent="text-white" />
        </div>
      </section>

      {/* 直近の締切 */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <p className="eyebrow">Upcoming Deadlines</p>
          <Link
            href="/tasks"
            className="font-mono text-[11px] uppercase tracking-[0.15em] text-slate-500 transition hover:text-brand-400"
          >
            View all →
          </Link>
        </div>
        {!ready ? (
          <p className="text-sm text-slate-500">読み込み中...</p>
        ) : upcoming.length === 0 ? (
          <p className="card p-8 text-center text-sm text-slate-500">
            締切のあるタスクはありません。
          </p>
        ) : (
          <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
            {upcoming.map((task) => {
              const d = daysUntil(task.dueDate);
              return (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-4 bg-slate-900 p-4 transition hover:bg-slate-800/60"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{task.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm text-slate-200">
                      {formatJaDate(task.dueDate)}
                    </p>
                    {d !== null && (
                      <p
                        className={`font-mono text-xs ${
                          d < 0 ? "text-rose-400" : d <= 2 ? "text-amber-400" : "text-slate-500"
                        }`}
                      >
                        {d < 0 ? `${-d}日超過` : d === 0 ? "今日" : `あと${d}日`}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 特徴 */}
      <section>
        <p className="eyebrow mb-5">Capabilities</p>
        <div className="grid gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800 sm:grid-cols-3">
          <FeatureCell
            index="01"
            title="タスク管理"
            body="状態・優先度・締切で整理。リストとカンバンを切替。"
          />
          <FeatureCell
            index="02"
            title="必要な知識・技術 / AI"
            body="各タスクにスキルや資料を紐付け。AIが提案・分解。"
          />
          <FeatureCell
            index="03"
            title="カレンダー連携"
            body="締切をGoogleカレンダーへ。予定と並べて表示。"
          />
        </div>
      </section>
    </div>
  );
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="bg-slate-900 p-5">
      <p className="eyebrow">{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${accent}`}>{value}</p>
    </div>
  );
}

function FeatureCell({
  index,
  title,
  body,
}: {
  index: string;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-slate-900 p-6">
      <span className="font-mono text-xs text-brand-500">{index}</span>
      <h3 className="mt-3 font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}
