"use client";

import type { Task } from "@/lib/types";
import { formatJaDate } from "@/lib/date";
import { StatusBadge, PriorityBadge, SkillTag } from "@/components/badges";
import { CalendarSync } from "@/components/CalendarSync";

export function TaskDetail({
  task,
  onEdit,
  onDelete,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
        <span className="text-sm text-slate-500">締切: {formatJaDate(task.dueDate)}</span>
      </div>

      {task.description && (
        <p className="whitespace-pre-wrap text-sm text-slate-700">{task.description}</p>
      )}

      {/* Googleカレンダー連携 */}
      <CalendarSync task={task} />

      {/* ★必要な知識・技術 */}
      <section className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
        <h3 className="text-sm font-semibold text-brand-800">必要な知識・技術</h3>
        {task.requiredSkills.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {task.requiredSkills.map((skill) => (
              <SkillTag key={skill}>{skill}</SkillTag>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">未設定</p>
        )}

        {task.knowledgeNotes && (
          <div className="mt-3">
            <p className="text-xs font-medium text-brand-700">前提知識・メモ</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
              {task.knowledgeNotes}
            </p>
          </div>
        )}

        {task.referenceLinks.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-brand-700">参考資料</p>
            <ul className="mt-1 space-y-1">
              {task.referenceLinks.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand-600 underline-offset-2 hover:underline"
                  >
                    {link.label || link.url} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          onClick={onDelete}
          className="rounded-lg px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
        >
          削除
        </button>
        <button
          onClick={onEdit}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          編集
        </button>
      </div>
    </div>
  );
}
