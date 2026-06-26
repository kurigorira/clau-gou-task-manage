"use client";

import { useState } from "react";
import type {
  Recurrence,
  ReferenceLink,
  Task,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";

export type TaskFormValues = Omit<Task, "id" | "createdAt" | "googleEventId">;

const EMPTY: TaskFormValues = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  dueDate: null,
  requiredSkills: [],
  knowledgeNotes: "",
  referenceLinks: [],
  tags: [],
  recurrence: "none",
};

function parseCommaList(value: string): string[] {
  return value
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function TaskForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "保存",
}: {
  initial?: Task;
  onSubmit: (values: TaskFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const base: TaskFormValues = initial
    ? {
        title: initial.title,
        description: initial.description,
        status: initial.status,
        priority: initial.priority,
        dueDate: initial.dueDate,
        requiredSkills: initial.requiredSkills,
        knowledgeNotes: initial.knowledgeNotes,
        referenceLinks: initial.referenceLinks,
        tags: initial.tags,
        recurrence: initial.recurrence,
      }
    : EMPTY;

  const [values, setValues] = useState<TaskFormValues>(base);
  const [skillsText, setSkillsText] = useState(base.requiredSkills.join(", "));
  const [tagsText, setTagsText] = useState(base.tags.join(", "));
  const [links, setLinks] = useState<ReferenceLink[]>(base.referenceLinks);

  const set = <K extends keyof TaskFormValues>(key: K, v: TaskFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) return;
    onSubmit({
      ...values,
      title: values.title.trim(),
      requiredSkills: parseCommaList(skillsText),
      tags: parseCommaList(tagsText),
      referenceLinks: links.filter((l) => l.url.trim()),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="タイトル" required>
        <input
          type="text"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="例: 企画書をまとめる"
          className="input"
          required
        />
      </Field>

      <Field label="説明">
        <textarea
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          className="input"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="状態">
          <select
            value={values.status}
            onChange={(e) => set("status", e.target.value as TaskStatus)}
            className="input"
          >
            <option value="todo">未着手</option>
            <option value="in-progress">進行中</option>
            <option value="done">完了</option>
          </select>
        </Field>
        <Field label="優先度">
          <select
            value={values.priority}
            onChange={(e) => set("priority", e.target.value as TaskPriority)}
            className="input"
          >
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </Field>
        <Field label="締切">
          <input
            type="date"
            value={values.dueDate ?? ""}
            onChange={(e) => set("dueDate", e.target.value || null)}
            className="input"
          />
        </Field>
      </div>

      <Field label="繰り返し（完了時に次回分を自動作成）">
        <select
          value={values.recurrence}
          onChange={(e) => set("recurrence", e.target.value as Recurrence)}
          className="input"
        >
          <option value="none">なし</option>
          <option value="daily">毎日</option>
          <option value="weekly">毎週</option>
          <option value="monthly">毎月</option>
        </select>
      </Field>

      <Field label="必要な知識・技術（カンマ区切り）">
        <input
          type="text"
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          placeholder="例: Next.js, OAuth, 設計力"
          className="input"
        />
      </Field>

      <Field label="前提知識・メモ">
        <textarea
          value={values.knowledgeNotes}
          onChange={(e) => set("knowledgeNotes", e.target.value)}
          rows={3}
          placeholder="このタスクをこなすために知っておくべきことを書いておきます。"
          className="input"
        />
      </Field>

      <Field label="参考資料リンク">
        <div className="space-y-2">
          {links.map((link, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={link.label}
                onChange={(e) =>
                  setLinks((prev) =>
                    prev.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)),
                  )
                }
                placeholder="ラベル"
                className="input flex-1"
              />
              <input
                type="url"
                value={link.url}
                onChange={(e) =>
                  setLinks((prev) =>
                    prev.map((l, j) => (j === i ? { ...l, url: e.target.value } : l)),
                  )
                }
                placeholder="https://..."
                className="input flex-[2]"
              />
              <button
                type="button"
                onClick={() => setLinks((prev) => prev.filter((_, j) => j !== i))}
                className="rounded-md px-2 text-slate-400 dark:text-slate-500 hover:text-rose-400"
                aria-label="削除"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLinks((prev) => [...prev, { label: "", url: "" }])}
            className="text-sm font-medium text-brand-400 hover:text-brand-300"
          >
            + リンクを追加
          </button>
        </div>
      </Field>

      <Field label="タグ（カンマ区切り）">
        <input
          type="text"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="例: 仕事, 学習"
          className="input"
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}
