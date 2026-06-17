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
    <div className="space-y-12">
      {/* ヒーロー */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-indigo-700 px-6 py-12 text-white shadow-lg sm:px-12 sm:py-16">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-100">
          Taskful
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
          やるべきことと、そのために必要な知識を、ひとつの場所で。
        </h1>
        <p className="mt-4 max-w-xl text-brand-100">
          タスクを管理しながら、各タスクに必要なスキル・技術・参考資料も一緒に整理。
          Googleカレンダー連携で締切も逃しません。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/tasks"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
          >
            タスクを管理する
          </Link>
          <Link
            href="/tasks?new=1"
            className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            + 新しいタスク
          </Link>
        </div>
      </section>

      {/* サマリー */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="未完了" value={ready ? open.length : "–"} accent="text-slate-900 dark:text-slate-100" />
        <StatCard label="進行中" value={ready ? inProgress.length : "–"} accent="text-blue-600" />
        <StatCard label="完了" value={ready ? done.length : "–"} accent="text-emerald-600" />
        <StatCard label="完了率" value={ready ? `${completionRate}%` : "–"} accent="text-brand-600" />
      </section>

      {/* 直近の締切 */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">直近の締切</h2>
          <Link href="/tasks" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            すべて見る →
          </Link>
        </div>
        {!ready ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">読み込み中...</p>
        ) : upcoming.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            締切のあるタスクはありません。
          </p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((task) => {
              const d = daysUntil(task.dueDate);
              return (
                <li
                  key={task.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {formatJaDate(task.dueDate)}
                    </p>
                    {d !== null && (
                      <p
                        className={`text-xs ${
                          d < 0 ? "text-rose-600" : d <= 2 ? "text-amber-600" : "text-slate-500 dark:text-slate-400"
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
        <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">できること</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <FeatureCard
            title="タスク管理"
            body="状態・優先度・締切でタスクを整理。リスト表示とカンバン表示を切り替えられます。"
            status="利用可能"
          />
          <FeatureCard
            title="必要な知識・技術 / AI"
            body="各タスクに必要なスキルや参考資料を紐付け。AIが必要知識の提案やサブタスク分解も行います。"
            status="利用可能"
          />
          <FeatureCard
            title="Googleカレンダー連携"
            body="締切をカレンダーに登録し、予定をタスクと並べて表示。設定から接続できます。"
            status="利用可能"
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function FeatureCard({
  title,
  body,
  status,
}: {
  title: string;
  body: string;
  status: string;
}) {
  const isAvailable = status === "利用可能";
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
          }`}
        >
          {status}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{body}</p>
    </div>
  );
}
