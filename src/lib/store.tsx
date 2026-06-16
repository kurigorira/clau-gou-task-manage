"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Task } from "./types";

const STORAGE_KEY = "clau-gou-tasks-v1";

// 初回アクセス時のサンプルタスク。公開直後でも画面が空にならないようにする。
const seedTasks: Task[] = [
  {
    id: "seed-1",
    title: "ポートフォリオサイトをデプロイする",
    description: "Next.jsで作ったサイトをGitHub Pagesに公開する。",
    status: "in-progress",
    priority: "high",
    dueDate: "2026-06-20",
    googleEventId: null,
    requiredSkills: ["Next.js", "GitHub Actions", "静的サイトホスティング"],
    knowledgeNotes:
      "basePath の設定と GitHub Pages の公開設定が必要。Actions のデプロイ権限も確認する。",
    referenceLinks: [
      {
        label: "Next.js Static Exports",
        url: "https://nextjs.org/docs/app/building-your-application/deploying/static-exports",
      },
    ],
    tags: ["開発", "公開"],
    recurrence: "none",
    createdAt: "2026-06-15",
  },
  {
    id: "seed-2",
    title: "Googleカレンダー連携の設計をまとめる",
    description: "OAuth認証と双方向同期のフローを整理する。",
    status: "todo",
    priority: "medium",
    dueDate: "2026-06-25",
    googleEventId: null,
    requiredSkills: ["OAuth 2.0", "Google Calendar API", "サーバーサイド処理"],
    knowledgeNotes:
      "トークンを安全に保持するためバックエンドが必要。アクセストークンとリフレッシュトークンの扱いに注意。",
    referenceLinks: [
      {
        label: "Google Calendar API",
        url: "https://developers.google.com/calendar/api/guides/overview",
      },
    ],
    tags: ["設計", "連携"],
    recurrence: "none",
    createdAt: "2026-06-15",
  },
  {
    id: "seed-3",
    title: "週次の振り返りメモを書く",
    description: "今週やったことと学びをまとめる。",
    status: "done",
    priority: "low",
    dueDate: "2026-06-14",
    googleEventId: null,
    requiredSkills: ["振り返りの習慣"],
    knowledgeNotes: "KPT（Keep/Problem/Try）で整理すると書きやすい。",
    referenceLinks: [],
    tags: ["習慣"],
    recurrence: "weekly",
    createdAt: "2026-06-10",
  },
];

/** YYYY-MM-DD を繰り返し設定に応じて次回日付に進める。 */
function advanceDate(iso: string, recurrence: Task["recurrence"]): string {
  const d = new Date(`${iso}T00:00:00`);
  if (recurrence === "daily") d.setDate(d.getDate() + 1);
  else if (recurrence === "weekly") d.setDate(d.getDate() + 7);
  else if (recurrence === "monthly") d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

interface TaskContextValue {
  tasks: Task[];
  ready: boolean;
  addTask: (task: Omit<Task, "id" | "createdAt">) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  getTask: (id: string) => Task | undefined;
  /** 全タスクを置き換える（インポート・全削除に使用）。 */
  replaceAll: (tasks: Task[]) => void;
}

const TaskContext = createContext<TaskContextValue | null>(null);

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);

  // 初期読み込み（localStorage）。
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setTasks(JSON.parse(raw) as Task[]);
      } else {
        setTasks(seedTasks);
      }
    } catch {
      setTasks(seedTasks);
    }
    setReady(true);
  }, []);

  // 変更を localStorage に保存。
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // ストレージが使えない環境では保存をスキップ。
    }
  }, [tasks, ready]);

  const addTask = useCallback<TaskContextValue["addTask"]>((task) => {
    const newTask: Task = {
      ...task,
      id: createId(),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setTasks((prev) => [newTask, ...prev]);
    return newTask;
  }, []);

  const updateTask = useCallback<TaskContextValue["updateTask"]>((id, patch) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
      // 繰り返しタスクが「完了」になったら、次回分を自動生成する。
      const before = prev.find((t) => t.id === id);
      const after = next.find((t) => t.id === id);
      if (
        before &&
        after &&
        before.status !== "done" &&
        after.status === "done" &&
        after.recurrence !== "none" &&
        after.dueDate
      ) {
        const clone: Task = {
          ...after,
          id: createId(),
          status: "todo",
          dueDate: advanceDate(after.dueDate, after.recurrence),
          googleEventId: null,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        return [clone, ...next];
      }
      return next;
    });
  }, []);

  const deleteTask = useCallback<TaskContextValue["deleteTask"]>((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getTask = useCallback<TaskContextValue["getTask"]>(
    (id) => tasks.find((t) => t.id === id),
    [tasks],
  );

  const replaceAll = useCallback<TaskContextValue["replaceAll"]>((next) => {
    setTasks(next);
  }, []);

  const value = useMemo<TaskContextValue>(
    () => ({ tasks, ready, addTask, updateTask, deleteTask, getTask, replaceAll }),
    [tasks, ready, addTask, updateTask, deleteTask, getTask, replaceAll],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks(): TaskContextValue {
  const ctx = useContext(TaskContext);
  if (!ctx) {
    throw new Error("useTasks は TaskProvider の内側で使ってください");
  }
  return ctx;
}
