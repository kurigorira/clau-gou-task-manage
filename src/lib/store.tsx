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
import { touchLocalData, recordDeletion, onSyncApplied } from "./driveSync";

const STORAGE_KEY = "clau-gou-tasks-v1";

// 初回アクセス時のサンプルタスク。公開直後でも画面が空にならないようにする。
const seedTasks: Task[] = [
  {
    id: "seed-1",
    title: "ポートフォリオサイトをデプロイする",
    description: "Next.jsで作ったサイトをGitHub Pagesに公開する。",
    status: "in-progress",
    priority: "high",
    startDate: "2026-06-16",
    dueDate: "2026-06-20",
    parentId: null,
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
    id: "seed-1a",
    title: "デプロイ設定を確認する",
    description: "basePath と GitHub Pages の公開元を確認する。",
    status: "todo",
    priority: "medium",
    startDate: "2026-06-16",
    dueDate: "2026-06-18",
    parentId: "seed-1",
    googleEventId: null,
    requiredSkills: [],
    knowledgeNotes: "",
    referenceLinks: [],
    tags: [],
    recurrence: "none",
    createdAt: "2026-06-15",
  },
  {
    id: "seed-2",
    title: "Googleカレンダー連携の設計をまとめる",
    description: "OAuth認証と双方向同期のフローを整理する。",
    status: "todo",
    priority: "medium",
    startDate: "2026-06-18",
    dueDate: "2026-06-25",
    parentId: null,
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
    startDate: "2026-06-14",
    dueDate: "2026-06-14",
    parentId: null,
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

const REPEATING: Task["recurrence"][] = ["daily", "weekly", "monthly"];

/** 毎日・毎週・毎月がはっきり設定されているときだけ繰り返しタスクとみなす。 */
function isRepeating(t: Pick<Task, "recurrence">): boolean {
  return REPEATING.includes(t.recurrence);
}

/**
 * 読み込んだタスクを補正する。
 * - 繰り返し機能より前に作ったタスクは recurrence が無いので「なし」に揃える。
 * - その状態で完了にすると、以前は同じ内容の未着手タスクが複製されていた。
 *   完了と同時に作られて一度も触っていない複製（同じ内容・未着手・0%・課題なし）を取り除く。
 */
function repairTasks(list: Task[]): { tasks: Task[]; removed: string[] } {
  const missing = (t: Task) => t.recurrence === undefined;
  const sameContent = (a: Task, b: Task) =>
    a.title === b.title &&
    a.description === b.description &&
    a.priority === b.priority &&
    (a.parentId ?? null) === (b.parentId ?? null) &&
    (a.startDate ?? null) === (b.startDate ?? null) &&
    (a.dueDate ?? null) === (b.dueDate ?? null);
  const pristine = (t: Task) =>
    t.status === "todo" &&
    (t.progress ?? 0) === 0 &&
    (t.issues ?? []).length === 0 &&
    !t.googleEventId &&
    typeof t.updatedAt === "number";

  const removed = new Set<string>();
  for (const c of list) {
    if (!missing(c) || !pristine(c)) continue;
    const original = list.find(
      (o) =>
        o.id !== c.id &&
        !removed.has(o.id) &&
        missing(o) &&
        sameContent(o, c) &&
        // 複製は作られてから触られていない（元のタスクの方が同時かそれ以降に更新されている）。
        (o.updatedAt ?? 0) >= (c.updatedAt as number) &&
        o.createdAt <= c.createdAt,
    );
    if (original) removed.add(c.id);
  }
  const tasks = list
    .filter((t) => !removed.has(t.id))
    .map((t) => (missing(t) ? { ...t, recurrence: "none" as const } : t));
  return { tasks, removed: Array.from(removed) };
}

/** 保存済みのタスクを読み、補正して返す（取り除いた複製は削除として記録し、他の端末からも消す）。 */
function loadRepaired(raw: string): Task[] {
  const { tasks, removed } = repairTasks(JSON.parse(raw) as Task[]);
  recordDeletion(removed);
  return tasks;
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
        setTasks(loadRepaired(raw));
      } else if (window.localStorage.getItem("clau-gou-google-client-id")) {
        // ログイン設定済みの端末は同期でデータが届くので、見本タスクは入れない
        // （入れると同期で他の端末にも広がってしまう）。
        setTasks([]);
      } else {
        setTasks(seedTasks);
      }
    } catch {
      setTasks(seedTasks);
    }
    setReady(true);
  }, []);

  // 他の端末の変更が同期で取り込まれたら、保存済みデータを読み直す。
  useEffect(
    () =>
      onSyncApplied(() => {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (raw) setTasks(loadRepaired(raw));
        } catch {
          /* noop */
        }
      }),
    [],
  );

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
      updatedAt: Date.now(),
    };
    setTasks((prev) => [newTask, ...prev]);
    touchLocalData();
    return newTask;
  }, []);

  const updateTask = useCallback<TaskContextValue["updateTask"]>((id, patch) => {
    touchLocalData();
    setTasks((prev) => {
      const now = Date.now();
      const next = prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now } : t));
      // 繰り返しタスクが「完了」になったら、次回分を自動生成する。
      const before = prev.find((t) => t.id === id);
      const after = next.find((t) => t.id === id);
      if (
        before &&
        after &&
        before.status !== "done" &&
        after.status === "done" &&
        isRepeating(after) &&
        after.dueDate
      ) {
        const nextDue = advanceDate(after.dueDate, after.recurrence);
        // 完了⇔未完了を往復したときに、次回分が二重にできないようにする。
        const exists = next.some(
          (t) =>
            t.id !== id &&
            t.title === after.title &&
            (t.parentId ?? null) === (after.parentId ?? null) &&
            t.dueDate === nextDue &&
            t.status !== "done",
        );
        if (exists) return next;
        const clone: Task = {
          ...after,
          id: createId(),
          status: "todo",
          startDate: after.startDate
            ? advanceDate(after.startDate, after.recurrence)
            : null,
          dueDate: nextDue,
          googleEventId: null,
          progress: 0,
          issues: [],
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: now,
        };
        return [clone, ...next];
      }
      return next;
    });
  }, []);

  const deleteTask = useCallback<TaskContextValue["deleteTask"]>((id) => {
    recordDeletion([id]);
    const now = Date.now();
    // 削除するタスクの子（小項目）は親を外して大項目化し、データを失わないようにする。
    setTasks((prev) =>
      prev
        .filter((t) => t.id !== id)
        .map((t) => (t.parentId === id ? { ...t, parentId: null, updatedAt: now } : t)),
    );
  }, []);

  const getTask = useCallback<TaskContextValue["getTask"]>(
    (id) => tasks.find((t) => t.id === id),
    [tasks],
  );

  const replaceAll = useCallback<TaskContextValue["replaceAll"]>((next) => {
    const now = Date.now();
    const keep = new Set(next.map((t) => t.id));
    setTasks((prev) => {
      // 置き換えで消えるタスクは削除として記録し、他の端末からも消す。
      recordDeletion(prev.filter((t) => !keep.has(t.id)).map((t) => t.id));
      return next.map((t) => ({ ...t, updatedAt: now }));
    });
    touchLocalData();
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
