"use client";

import Link from "next/link";
import { useState } from "react";
import { useAnthropic, type SubtaskSuggestion } from "@/lib/anthropic";
import { useTasks } from "@/lib/store";
import type { Task } from "@/lib/types";

export function AiAssist({ task }: { task: Task }) {
  const { isConfigured, suggestSkills, decomposeTask } = useAnthropic();
  const { updateTask, addTask } = useTasks();
  const [busy, setBusy] = useState<null | "skills" | "subtasks">(null);
  const [error, setError] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<SubtaskSuggestion[] | null>(null);
  const [added, setAdded] = useState(false);

  if (!isConfigured) {
    return (
      <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
        🤖{" "}
        <Link href="/settings" className="font-medium text-brand-300 hover:underline">
          設定でAI連携
        </Link>
        すると、必要な知識の自動提案やサブタスク分解が使えます。
      </div>
    );
  }

  const handleSuggestSkills = async () => {
    setBusy("skills");
    setError(null);
    try {
      const s = await suggestSkills({ title: task.title, description: task.description });
      // 既存のスキルとマージ（重複除去）。
      const mergedSkills = Array.from(
        new Set([...task.requiredSkills, ...s.requiredSkills]),
      );
      const mergedLinks = [...task.referenceLinks, ...s.referenceLinks];
      const notes = task.knowledgeNotes
        ? `${task.knowledgeNotes}\n\n${s.knowledgeNotes}`
        : s.knowledgeNotes;
      updateTask(task.id, {
        requiredSkills: mergedSkills,
        knowledgeNotes: notes,
        referenceLinks: mergedLinks,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "提案の取得に失敗しました");
    } finally {
      setBusy(null);
    }
  };

  const handleDecompose = async () => {
    setBusy("subtasks");
    setError(null);
    setAdded(false);
    try {
      const result = await decomposeTask({
        title: task.title,
        description: task.description,
      });
      setSubtasks(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "分解に失敗しました");
    } finally {
      setBusy(null);
    }
  };

  const addSubtasksAsTasks = () => {
    if (!subtasks) return;
    for (const st of subtasks) {
      addTask({
        title: st.title,
        description: st.description,
        status: "todo",
        priority: task.priority,
        dueDate: null,
        googleEventId: null,
        requiredSkills: [],
        knowledgeNotes: "",
        referenceLinks: [],
        tags: [...task.tags, `親:${task.title}`.slice(0, 30)],
        recurrence: "none",
      });
    }
    setAdded(true);
    setSubtasks(null);
  };

  return (
    <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-3">
      <p className="text-xs font-semibold text-brand-300">🤖 AIアシスト</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={handleSuggestSkills}
          disabled={busy !== null}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {busy === "skills" ? "提案中..." : "必要な知識・技術を提案"}
        </button>
        <button
          onClick={handleDecompose}
          disabled={busy !== null}
          className="rounded-md border border-brand-500/40 px-3 py-1.5 text-xs font-semibold text-brand-300 hover:bg-brand-500/20 disabled:opacity-50"
        >
          {busy === "subtasks" ? "分解中..." : "サブタスクに分解"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
      {added && (
        <p className="mt-2 text-xs text-emerald-400">サブタスクをタスクとして追加しました。</p>
      )}

      {subtasks && subtasks.length > 0 && (
        <div className="mt-3 rounded-lg border border-brand-500/30 bg-white dark:bg-slate-800 p-3">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">提案されたサブタスク</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
            {subtasks.map((st, i) => (
              <li key={i}>
                <span className="font-medium">{st.title}</span>
                {st.description && (
                  <span className="text-slate-500 dark:text-slate-400"> — {st.description}</span>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-2 flex gap-2">
            <button
              onClick={addSubtasksAsTasks}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-500"
            >
              タスクとして追加
            </button>
            <button
              onClick={() => setSubtasks(null)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
        ※ AIの提案は参考情報です。リンクの実在性などは確認してください。
      </p>
    </div>
  );
}
