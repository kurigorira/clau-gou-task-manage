"use client";

import { useMemo } from "react";
import { useTasks } from "@/lib/store";
import type { Task } from "@/lib/types";
import { SkillTag } from "@/components/badges";

export default function KnowledgePage() {
  const { tasks, ready } = useTasks();

  // スキルごとに、それを必要とするタスクをまとめる。
  const skillMap = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      for (const skill of t.requiredSkills) {
        const list = map.get(skill) ?? [];
        list.push(t);
        map.set(skill, list);
      }
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [tasks]);

  const allLinks = useMemo(
    () =>
      tasks.flatMap((t) =>
        t.referenceLinks.map((l) => ({ ...l, taskTitle: t.title, taskId: t.id })),
      ),
    [tasks],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">ナレッジ</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          各タスクに登録した「必要な知識・技術」と参考資料を横断的に見られます。
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">スキル別タスク</h2>
        {!ready ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">読み込み中...</p>
        ) : skillMap.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            まだ知識・技術が登録されたタスクがありません。タスク詳細から登録できます。
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {skillMap.map(([skill, relatedTasks]) => (
              <div
                key={skill}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <SkillTag>{skill}</SkillTag>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{relatedTasks.length}件</span>
                </div>
                <ul className="mt-3 space-y-1">
                  {relatedTasks.map((t) => (
                    <li key={t.id} className="truncate text-sm text-slate-600 dark:text-slate-300">
                      ・{t.title}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">参考資料リンク集</h2>
        {ready && allLinks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            参考資料リンクはまだありません。
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            {allLinks.map((link, i) => (
              <li key={i} className="flex items-center justify-between gap-3 p-4">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm font-medium text-brand-600 hover:underline"
                >
                  {link.label || link.url} ↗
                </a>
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{link.taskTitle}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
