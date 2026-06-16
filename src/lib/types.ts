export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "high" | "medium" | "low";
export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export interface ReferenceLink {
  label: string;
  url: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** 締切（ISO日付文字列 YYYY-MM-DD）。Googleカレンダー連携の対象。 */
  dueDate: string | null;
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
  createdAt: string;
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
