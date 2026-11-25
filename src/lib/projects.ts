/**
 * PJ進捗（プロジェクト台帳）のデータ。
 *
 * データ本体は Google ドライブ上の `atlas-projects.json`（非公開）に置き、
 * Claude の定期タスクが毎朝作り直す。サイトは公開されているため、
 * 院内の案件名などはリポジトリに含めず、ログイン後にドライブから読む。
 */

export const PROJECTS_FILE_NAME = "atlas-projects.json";

export type PjStatus = "green" | "yellow" | "red" | "none" | "done";

export interface PjRepo {
  name: string;
  /** confirmed: 本人確認済み / guess: Claude の推定（要確認） */
  mapping: "confirmed" | "guess";
  private?: boolean;
  pushedAt?: string;
}

export interface PjStep {
  label: string;
  done: boolean;
}

export interface Project {
  id: string;
  name: string;
  category: string;
  priority?: "高" | "中" | "低";
  status: PjStatus;
  /** 最後に動きがあった日 YYYY-MM-DD */
  lastActivity?: string | null;
  /** 何で動きを確認したか（日報・投稿・GitHub など） */
  lastActivitySource?: string;
  summary?: string;
  blocker?: string;
  next?: string;
  issues?: string[];
  repos?: PjRepo[];
  steps?: PjStep[];
  /** 定例などの次回日付 */
  nextDate?: string;
}

export interface UnassignedRepo {
  name: string;
  pushedAt: string;
  private?: boolean;
  note?: string;
}

export interface ProjectsData {
  version: 1;
  generatedAt: string;
  headline?: string;
  todayActions?: string[];
  projects: Project[];
  unassignedRepos?: UnassignedRepo[];
}

export const STATUS_META: Record<PjStatus, { label: string; dot: string; chip: string; order: number }> = {
  red: { label: "停滞", dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700 ring-rose-200", order: 0 },
  yellow: { label: "注意", dot: "bg-amber-400", chip: "bg-amber-50 text-amber-700 ring-amber-200", order: 1 },
  green: { label: "順調", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", order: 2 },
  none: { label: "記録なし", dot: "bg-slate-300", chip: "bg-slate-50 text-slate-500 ring-slate-200", order: 3 },
  done: { label: "完了", dot: "bg-brand-500", chip: "bg-brand-50 text-brand-700 ring-brand-200", order: 4 },
};

/** 今日から見た経過日数（未来なら負）。 */
export function daysAgo(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - d.getTime()) / 86_400_000);
}

export function agoLabel(iso?: string | null): string {
  const n = daysAgo(iso);
  if (n === null) return "記録なし";
  if (n <= 0) return "今日";
  if (n === 1) return "昨日";
  return `${n}日前`;
}

export class ProjectsAuthError extends Error {}

/** ドライブから最新の atlas-projects.json を読む。見つからなければ null。 */
export async function loadProjectsFromDrive(
  token: string,
): Promise<{ data: ProjectsData; fileId: string; modifiedTime: string } | null> {
  const params = new URLSearchParams({
    q: `name = '${PROJECTS_FILE_NAME}' and trashed = false`,
    orderBy: "modifiedTime desc",
    fields: "files(id,modifiedTime)",
    pageSize: "1",
  });
  const list = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (list.status === 401) throw new ProjectsAuthError("401");
  if (!list.ok) throw new Error(`Drive ${list.status}`);
  const files = ((await list.json()) as { files?: { id: string; modifiedTime: string }[] }).files;
  const f = files?.[0];
  if (!f) return null;
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new ProjectsAuthError("401");
  if (!res.ok) throw new Error(`Drive ${res.status}`);
  const data = (await res.json()) as ProjectsData;
  return { data, fileId: f.id, modifiedTime: f.modifiedTime };
}
