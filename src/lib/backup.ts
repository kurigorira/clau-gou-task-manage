import type {
  Recurrence,
  ReferenceLink,
  Task,
  TaskPriority,
  TaskStatus,
} from "./types";

const EXPORT_VERSION = 1;
const STATUSES: TaskStatus[] = ["todo", "in-progress", "done"];
const PRIORITIES: TaskPriority[] = ["high", "medium", "low"];
const RECURRENCES: Recurrence[] = ["none", "daily", "weekly", "monthly"];

interface BackupFile {
  app: string;
  version: number;
  exportedAt: string;
  tasks: Task[];
}

/** 全タスクをバックアップ用JSON文字列にする。 */
export function buildBackup(tasks: Task[]): string {
  const data: BackupFile = {
    app: "clau-gou-task-manage",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    tasks,
  };
  return JSON.stringify(data, null, 2);
}

/** ブラウザでJSONファイルをダウンロードさせる。 */
export function downloadBackup(tasks: Task[]): void {
  const blob = new Blob([buildBackup(tasks)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `taskful-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function asLinks(v: unknown): ReferenceLink[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({ label: asString(x.label), url: asString(x.url) }))
    .filter((l) => l.url);
}

/** 任意の入力を安全な Task に正規化する（不正項目はデフォルト補完）。 */
function sanitizeTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = asString(o.title).trim();
  if (!title) return null;

  const status = STATUSES.includes(o.status as TaskStatus)
    ? (o.status as TaskStatus)
    : "todo";
  const priority = PRIORITIES.includes(o.priority as TaskPriority)
    ? (o.priority as TaskPriority)
    : "medium";
  const recurrence = RECURRENCES.includes(o.recurrence as Recurrence)
    ? (o.recurrence as Recurrence)
    : "none";
  const due = asString(o.dueDate);

  return {
    id:
      asString(o.id) ||
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    title,
    description: asString(o.description),
    status,
    priority,
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
    googleEventId: typeof o.googleEventId === "string" ? o.googleEventId : null,
    requiredSkills: asStringArray(o.requiredSkills),
    knowledgeNotes: asString(o.knowledgeNotes),
    referenceLinks: asLinks(o.referenceLinks),
    tags: asStringArray(o.tags),
    recurrence,
    createdAt:
      asString(o.createdAt) || new Date().toISOString().slice(0, 10),
  };
}

/** バックアップJSON文字列を解析し、正規化済みのタスク配列を返す。 */
export function parseBackup(text: string): Task[] {
  const data = JSON.parse(text) as unknown;
  let rawTasks: unknown;
  if (Array.isArray(data)) {
    rawTasks = data; // タスク配列だけのファイルも許容。
  } else if (data && typeof data === "object" && "tasks" in data) {
    rawTasks = (data as { tasks: unknown }).tasks;
  } else {
    throw new Error("タスクデータが見つかりません。");
  }
  if (!Array.isArray(rawTasks)) {
    throw new Error("タスクの形式が正しくありません。");
  }
  const tasks = rawTasks
    .map(sanitizeTask)
    .filter((t): t is Task => t !== null);
  if (tasks.length === 0) {
    throw new Error("有効なタスクが含まれていません。");
  }
  return tasks;
}
