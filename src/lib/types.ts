export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "high" | "medium" | "low";
export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export interface ReferenceLink {
  label: string;
  url: string;
}

/** タスクの課題（困っていること・解決すべきこと）。 */
export interface TaskIssue {
  id: string;
  text: string;
  /** 解決済みか。 */
  resolved: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** 開始日（ISO日付文字列 YYYY-MM-DD）。ガントの帯の始点。 */
  startDate: string | null;
  /** 締切（ISO日付文字列 YYYY-MM-DD）。Googleカレンダー連携の対象／ガントの帯の終点。 */
  dueDate: string | null;
  /** 親タスク（大項目）のID。null なら大項目（トップレベル）。 */
  parentId: string | null;
  /** Googleカレンダー連携時のイベントID（Phase 2で使用）。 */
  googleEventId: string | null;
  /** ★必要な知識・技術（タグ） */
  requiredSkills: string[];
  /** ★前提知識・メモ */
  knowledgeNotes: string;
  /** ★参考資料リンク */
  referenceLinks: ReferenceLink[];
  tags: string[];
  /** 繰り返し設定。完了時に次回分を自動生成する。 */
  recurrence: Recurrence;
  /** 進捗（0〜100%）。未設定の古いデータは状態から推定する（progressOf を使う）。 */
  progress?: number;
  /** 課題の一覧。 */
  issues?: TaskIssue[];
  createdAt: string;
  /** 最終更新時刻（ms）。端末間同期のマージに使う。 */
  updatedAt?: number;
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "未着手",
  "in-progress": "進行中",
  done: "完了",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: "なし",
  daily: "毎日",
  weekly: "毎週",
  monthly: "毎月",
};

export const STATUS_ORDER: TaskStatus[] = ["todo", "in-progress", "done"];

/** タスクの進捗%（未設定なら完了=100、それ以外=0）。 */
export function progressOf(t: Pick<Task, "progress" | "status">): number {
  if (typeof t.progress === "number") return Math.max(0, Math.min(100, Math.round(t.progress)));
  return t.status === "done" ? 100 : 0;
}

/** 未解決の課題の数。 */
export function openIssueCount(t: Pick<Task, "issues">): number {
  return (t.issues ?? []).filter((i) => !i.resolved).length;
}
