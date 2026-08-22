/**
 * Google Drive の appDataFolder（アプリ専用の非公開領域）を使った端末間同期。
 * タスク・行事予定・お気に入り・天気の都市設定をJSONひとつにまとめて保存する。
 * 単独ユーザー前提のため、競合は「更新時刻が新しい方が勝つ」方式で解決する。
 */

const FILE_NAME = "atlas-lite-sync.json";

/** 同期対象の localStorage キー。 */
const DATA_KEYS = [
  "clau-gou-tasks-v1", // タスク
  "atlas-events-v1", // 行事予定
  "atlas-favorites-v1", // お気に入り
  "atlas-weather-city", // 天気の都市
  "clau-gou-anthropic-key", // AIキーは端末ごとに置きたい場合もあるが、個人利用前提で同期する
];

const META_KEY = "atlas-data-updated-at"; // ローカルデータの最終更新時刻(ms)
const LAST_SYNC_KEY = "atlas-sync-last"; // 最後に同期した時刻(ms)

interface SyncPayload {
  version: 1;
  updatedAt: number;
  data: Record<string, string | null>;
}

/** データを変更したときに呼ぶ（store/events/お気に入りから）。 */
export function touchLocalData(): void {
  try {
    window.localStorage.setItem(META_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
}

export function localUpdatedAt(): number {
  try {
    return Number(window.localStorage.getItem(META_KEY) ?? 0);
  } catch {
    return 0;
  }
}

export function lastSyncedAt(): number {
  try {
    return Number(window.localStorage.getItem(LAST_SYNC_KEY) ?? 0);
  } catch {
    return 0;
  }
}

function collectLocal(): SyncPayload {
  const data: Record<string, string | null> = {};
  for (const key of DATA_KEYS) {
    try {
      data[key] = window.localStorage.getItem(key);
    } catch {
      data[key] = null;
    }
  }
  return { version: 1, updatedAt: localUpdatedAt(), data };
}

function applyRemote(payload: SyncPayload): void {
  for (const key of DATA_KEYS) {
    const value = payload.data[key];
    try {
      if (value === null || value === undefined) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      /* noop */
    }
  }
  try {
    window.localStorage.setItem(META_KEY, String(payload.updatedAt));
  } catch {
    /* noop */
  }
}

function markSynced(): void {
  try {
    window.localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
}

async function api<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Drive API ${res.status}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function findFileId(token: string): Promise<string | null> {
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    q: `name = '${FILE_NAME}'`,
    fields: "files(id)",
    pageSize: "1",
  });
  const data = await api<{ files?: { id: string }[] }>(
    token,
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
  );
  return data.files?.[0]?.id ?? null;
}

async function downloadPayload(token: string, id: string): Promise<SyncPayload | null> {
  try {
    return await api<SyncPayload>(
      token,
      `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
    );
  } catch {
    return null;
  }
}

async function uploadPayload(
  token: string,
  id: string | null,
  payload: SyncPayload,
): Promise<void> {
  const body = JSON.stringify(payload);
  if (id) {
    await api(token, `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return;
  }
  // 新規作成はメタデータ＋本文のmultipartで行う。
  const boundary = "atlas_sync_boundary";
  const multipart =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify({ name: FILE_NAME, parents: ["appDataFolder"] }) +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    body +
    `\r\n--${boundary}--`;
  await api(token, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body: multipart,
  });
}

export type SyncResult =
  | { action: "uploaded" }
  | { action: "downloaded" }
  | { action: "none" };

/**
 * 同期を実行する。リモートの方が新しければローカルへ反映（呼び出し側でリロード推奨）、
 * ローカルの方が新しければアップロードする。
 */
export async function syncWithDrive(token: string): Promise<SyncResult> {
  const local = collectLocal();
  const id = await findFileId(token);
  const remote = id ? await downloadPayload(token, id) : null;

  if (remote && remote.updatedAt > local.updatedAt) {
    applyRemote(remote);
    markSynced();
    return { action: "downloaded" };
  }
  if (!remote || local.updatedAt > remote.updatedAt) {
    await uploadPayload(token, id, local);
    markSynced();
    return { action: "uploaded" };
  }
  markSynced();
  return { action: "none" };
}
