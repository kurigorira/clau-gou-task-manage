"use client";

import { useState } from "react";
import { progressOf, type Task, type TaskIssue } from "@/lib/types";

/** 完了⇔未完了を切り替えるための更新内容。未完了に戻すときは「進行中・90%」にする。 */
export function toggleDonePatch(task: Task): Partial<Task> {
  if (task.status === "done") {
    const p = progressOf(task);
    return { status: "in-progress", progress: p >= 100 ? 90 : p };
  }
  return { status: "done", progress: 100 };
}

/** 丸いチェックの完了ボタン（一覧・カンバン用）。 */
export function DoneToggle({
  task,
  onToggle,
  size = "md",
}: {
  task: Task;
  onToggle: () => void;
  size?: "sm" | "md";
}) {
  const done = task.status === "done";
  const dim = size === "sm" ? "h-6 w-6 text-xs" : "h-7 w-7 text-sm";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      title={done ? "未完了に戻す" : "完了にする"}
      aria-label={done ? "未完了に戻す" : "完了にする"}
      className={`flex shrink-0 items-center justify-center rounded-full border-2 font-bold transition ${dim} ${
        done
          ? "border-emerald-500 bg-emerald-500 text-white"
          : "border-slate-300 bg-white text-transparent hover:border-emerald-500 hover:text-emerald-500"
      }`}
    >
      ✓
    </button>
  );
}

/** 進捗バー（細い横棒＋%表示）。 */
export function ProgressBar({ value, compact }: { value: number; compact?: boolean }) {
  const color = value >= 100 ? "bg-emerald-500" : value > 0 ? "bg-brand-500" : "bg-slate-300";
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 overflow-hidden rounded-full bg-slate-100 ${compact ? "h-1.5" : "h-2"}`}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-500">
        {value}%
      </span>
    </div>
  );
}

const STEPS = [0, 25, 50, 75, 100];

/** 進捗の入力（スライダー＋よく使う値のボタン）。 */
export function ProgressInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer accent-brand-600"
          aria-label="進捗"
        />
        <span className="w-11 text-right text-sm font-bold tabular-nums text-slate-700">
          {value}%
        </span>
      </div>
      <div className="flex gap-1.5">
        {STEPS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
              value === s
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s}%
          </button>
        ))}
      </div>
    </div>
  );
}

function newIssueId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 課題の一覧（追加・解決チェック・削除）。フォームの中でも使えるよう submit しない。 */
export function IssueList({
  issues,
  onChange,
}: {
  issues: TaskIssue[];
  onChange: (next: TaskIssue[]) => void;
}) {
  const [text, setText] = useState("");

  const add = () => {
    const t = text.trim();
    if (!t) return;
    onChange([...issues, { id: newIssueId(), text: t, resolved: false }]);
    setText("");
  };

  return (
    <div className="space-y-2">
      {issues.length > 0 && (
        <ul className="space-y-1.5">
          {issues.map((issue) => (
            <li key={issue.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={issue.resolved}
                onChange={() =>
                  onChange(
                    issues.map((i) =>
                      i.id === issue.id ? { ...i, resolved: !i.resolved } : i,
                    ),
                  )
                }
                className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-emerald-600"
                aria-label="解決済み"
              />
              <span
                className={`min-w-0 flex-1 text-sm ${
                  issue.resolved ? "text-slate-400 line-through" : "text-slate-800"
                }`}
              >
                {issue.text}
              </span>
              <button
                type="button"
                onClick={() => onChange(issues.filter((i) => i.id !== issue.id))}
                className="shrink-0 rounded px-1.5 text-slate-300 hover:text-rose-600"
                aria-label="課題を削除"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // フォームの送信ではなく、課題の追加にする。
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              add();
            }
          }}
          placeholder="例: 予算の承認が下りていない"
          className="input flex-1"
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white hover:bg-slate-700"
        >
          追加
        </button>
      </div>
    </div>
  );
}
