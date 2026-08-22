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
    <div className="space-y-10">
      {/* ヒーロー */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-sky-400 px-6 py-10 text-white shadow-lg sm:px-10 sm:py-14">
        <h1 className="max-w-2xl text-2xl font-bold leading-snug sm:text-4xl">
          やるべきことと、必要な知識を、
          <br className="hidden sm:block" />
          ひとつの場所で。
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
          タスクごとにスキル・参考資料も整理。Googleカレンダー連携とAIアシストで、締切も知識も逃しません。
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/tasks"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
          >
            タスクを管理する
          </Link>
          <Link
            href="/tasks?new=1"
            className="rounded-full border border-white/50 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            ＋ 新しいタスク
          </Link>
        </div>
      </section>

      {/* サマリー */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label="未完了" value={ready ? open.length : "–"} accent="text-slate-900" />
        <StatCard label="進行中" value={ready ? inProgress.length : "–"} accent="text-blue-600" />
        <StatCard label="完了" value={ready ? done.length : "–"} accent="text-emerald-600" />
        <StatCard label="完了率" value={ready ? `${completionRate}%` : "–"} accent="text-brand-600" />
      </section>

      {/* 直近の締切 */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">直近の締切</h2>
          <Link
            href="/tasks"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            すべて見る →
          </Link>
        </div>
        {!ready ? (
          <p className="text-sm text-slate-500">読み込み中...</p>
        ) : upcoming.length === 0 ? (
          <p className="card border-dashed p-8 text-center text-sm text-slate-500">
            締切のあるタスクはありません。
          </p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((task) => {
              const d = daysUntil(task.dueDate);
              return (
                <li key={task.id} className="card flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{task.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-800">
                      {formatJaDate(task.dueDate)}
                    </p>
                    {d !== null && (
                      <p
                        className={`mt-0.5 text-xs font-medium ${
                          d < 0 ? "text-rose-600" : d <= 2 ? "text-amber-600" : "text-slate-400"
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

      {/* できること */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-900 sm:text-xl">できること</h2>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          <FeatureCard
            emoji="✅"
            title="タスク管理"
            body="大項目・小項目で整理。リスト / カンバン / ガントを切替。"
            href="/tasks"
          />
          <FeatureCard
            emoji="🧠"
            title="知識・AIアシスト"
            body="必要なスキルや資料をタスクに紐付け。AIが提案・分解。"
            href="/knowledge"
          />
          <FeatureCard
            emoji="📅"
            title="カレンダー連携"
            body="締切をGoogleカレンダーへ登録。予定と並べて確認。"
            href="/calendar"
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
    <div className="card p-4 sm:p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold tracking-tight ${accent}`}>{value}</p>
    </div>
  );
}

function FeatureCard({
  emoji,
  title,
  body,
  href,
}: {
  emoji: string;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link href={href} className="card block p-5 transition hover:border-brand-200 hover:shadow-md">
      <span className="text-2xl">{emoji}</span>
      <h3 className="mt-2 font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">{body}</p>
    </Link>
  );
}
