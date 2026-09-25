/**
 * Google Drive の appDataFolder（アプリ専用の非公開領域）を使った端末間同期。
 *
 * タスク・行事予定・お気に入りは1件ごとの更新時刻（updatedAt）で「マージ」する。
 * どちらかの端末で消したものは削除記録（tombstone）で両方から消す。
 * 天気の都市やAIキーのような単一の設定値は、更新時刻の新しい方を採用する。
 */

const FILE_NAME = "atlas-lite-sync.json";

/** 1件ずつマージする配列データ（localStorage キー）。 */
const COLLECTIONS = {
  tasks: "clau-gou-tasks-v1",
  events: "atlas-events-v1",
  favorites: "atlas-favorites-v1",
} as const;
type CollectionName = keyof typeof COLLECTIONS;

/** 単一の設定値（localStorage キー）。 */
const SCALARS = ["atlas-weather-city", "clau-gou-anthropic-key"];

const TOMBSTONE_KEY = "atlas-deleted-v1"; // { [id]: 削除時刻(ms) }
const SCALAR_TS_KEY = "atlas-scalar-ts-v1"; // { [key]: 更新時刻(ms) }
const META_KEY = "atlas-data-updated-at"; // ローカルで最後に変更した時刻(ms)
const LAST_SYNC_KEY = "atlas-sync-last"; // 最後に同期できた時刻(ms)

/** 同期でローカルのデータが書き換わったときに発火するイベント名。 */
export const SYNC_APPLIED_EVENT = "atlas-sync-applied";
/** 同期状態が変わったときに発火するイベント名。 */
export const SYNC_STATUS_EVENT = "atlas-sync-status";

interface Item {
  id: string;
  updatedAt?: number;
  [key: string]: unknown;
}

interface SyncPayloadV2 {
  version: 2;
  collections: Record<CollectionName, Item[]>;
  tombstones: Record<string, number>;
  scalars: Record<string, { value: string | null; ts: number }>;
}

/** 旧形式（端末データを丸ごと保存していた版）。 */
interface SyncPayloadV1 {
  version: 1;
  updatedAt: number;
  data: Record<string, string | null>;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

/** データを変更したときに呼ぶ（次の同期でアップロードされる）。 */
export function touchLocalData(): void {
  try {
    window.localStorage.setItem(META_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
}

/** 削除を記録する（他の端末からも消えるようにする）。 */
export function recordDeletion(ids: string[]): void {
  if (ids.length === 0) return;
  const tomb = readJson<Record<string, number>>(TOMBSTONE_KEY, {});
  const now = Date.now();
  for (const id of ids) tomb[id] = now;
  writeJson(TOMBSTONE_KEY, tomb);
  touchLocalData();
}

/** 単一の設定値を変更したときに呼ぶ。 */
export function touchScalar(key: string): void {
  const ts = readJson<Record<string, number>>(SCALAR_TS_KEY, {});
  ts[key] = Date.now();
  writeJson(SCALAR_TS_KEY, ts);
  touchLocalData();
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

function collectLocal(): SyncPayloadV2 {
  const collections = {} as Record<CollectionName, Item[]>;
  for (const name of Object.keys(COLLECTIONS) as CollectionName[]) {
    collections[name] = readJson<Item[]>(COLLECTIONS[name], []);
  }
  const scalarTs = readJson<Record<string, number>>(SCALAR_TS_KEY, {});
  const scalars: SyncPayloadV2["scalars"] = {};
  for (const key of SCALARS) {
    let value: string | null = null;
    try {
      value = window.localStorage.getItem(key);
    } catch {
      /* noop */
    }
    scalars[key] = { value, ts: scalarTs[key] ?? 0 };
  }
  return {
    version: 2,
    collections,
    tombstones: readJson<Record<string, number>>(TOMBSTONE_KEY, {}),
    scalars,
  };
}

/** 旧形式のリモートデータを新形式として読む（全件 updatedAt=0 扱いでマージに参加させる）。 */
function upgradeV1(p: SyncPayloadV1): SyncPayloadV2 {
  const parse = (raw: string | null | undefined): Item[] => {
    try {
      const v = raw ? JSON.parse(raw) : [];
      return Array.isArray(v) ? (v as Item[]) : [];
    } catch {
      return [];
    }
  };
  const collections = {} as Record<CollectionName, Item[]>;
  for (const name of Object.keys(COLLECTIONS) as CollectionName[]) {
    collections[name] = parse(p.data?.[COLLECTIONS[name]]);
  }
  const scalars: SyncPayloadV2["scalars"] = {};
  for (const key of SCALARS) scalars[key] = { value: p.data?.[key] ?? null, ts: 0 };
  return { version: 2, collections, tombstones: {}, scalars };
}

function mergeItems(
  a: Item[],
  b: Item[],
  tombstones: Record<string, number>,
): Item[] {
  const byId = new Map<string, Item>();
  for (const item of [...a, ...b]) {
    if (!item || typeof item.id !== "string") continue;
    const cur = byId.get(item.id);
    if (!cur || (item.updatedAt ?? 0) > (cur.updatedAt ?? 0)) byId.set(item.id, item);
  }
  // 削除記録より後に更新されたもの以外は消す。
  return Array.from(byId.values()).filter((item) => {
    const deletedAt = tombstones[item.id];
    return deletedAt === undefined || (item.updatedAt ?? 0) > deletedAt;
  });
}

function merge(local: SyncPayloadV2, remote: SyncPayloadV2): SyncPayloadV2 {
  const tombstones: Record<string, number> = { ...remote.tombstones };
  for (const [id, t] of Object.entries(local.tombstones)) {
    tombstones[id] = Math.max(t, tombstones[id] ?? 0);
  }
  const collections = {} as Record<CollectionName, Item[]>;
  for (const name of Object.keys(COLLECTIONS) as CollectionName[]) {
    // ローカルを先に置き、同じ時刻ならローカル側の並び・内容を優先する。
    collections[name] = mergeItems(
      local.collections[name] ?? [],
      remote.collections[name] ?? [],
      tombstones,
    );
  }
  const scalars: SyncPayloadV2["scalars"] = {};
  for (const key of SCALARS) {
    const l = local.scalars[key] ?? { value: null, ts: 0 };
    const r = remote.scalars?.[key] ?? { value: null, ts: 0 };
    // 同時刻なら値が入っている方を採用する（旧形式からの移行時にキーを失わないため）。
    scalars[key] = r.ts > l.ts || (r.ts === l.ts && l.value === null) ? r : l;
  }
  return { version: 2, collections, tombstones, scalars };
}

function applyLocal(p: SyncPayloadV2): void {
  for (const name of Object.keys(COLLECTIONS) as CollectionName[]) {
    writeJson(COLLECTIONS[name], p.collections[name]);
  }
  writeJson(TOMBSTONE_KEY, p.tombstones);
  const ts: Record<string, number> = {};
  for (const key of SCALARS) {
    const s = p.scalars[key];
    ts[key] = s?.ts ?? 0;
    try {
      if (s?.value === null || s?.value === undefined) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, s.value);
    } catch {
      /* noop */
    }
  }
  writeJson(SCALAR_TS_KEY, ts);
}

function markSynced(): void {
  try {
    window.localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
  window.dispatchEvent(new Event(SYNC_STATUS_EVENT));
}

export class DriveAuthError extends Error {}

async function api<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (res.status === 401) throw new DriveAuthError("Drive API 401");
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

async function downloadPayload(token: string, id: string): Promise<SyncPayloadV2 | null> {
  const raw = await api<SyncPayloadV1 | SyncPayloadV2 | undefined>(
    token,
    `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
  );
  if (!raw) return null;
  if (raw.version === 2) return raw;
  if (raw.version === 1) return upgradeV1(raw);
  return null;
}

async function uploadPayload(
  token: string,
  id: string | null,
  payload: SyncPayloadV2,
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

export interface SyncResult {
  /** 他の端末の変更をこの端末に取り込んだか。 */
  pulled: boolean;
  /** この端末の変更をDriveに送ったか。 */
  pushed: boolean;
}

/**
 * 同期を実行する。Drive上のデータとこの端末のデータをマージし、
 * 差分があれば両方を更新する。この端末が書き換わった場合は SYNC_APPLIED_EVENT を発火する。
 */
export async function syncWithDrive(token: string): Promise<SyncResult> {
  const startedAt = localUpdatedAt();
  const id = await findFileId(token);
  const remote = id ? await downloadPayload(token, id) : null;

  const local = collectLocal();
  const merged = remote ? merge(local, remote) : local;

  const mergedJson = JSON.stringify(merged);
  const pulled = JSON.stringify(local) !== mergedJson;
  const pushed = !remote || JSON.stringify(remote) !== mergedJson;

  if (pushed) await uploadPayload(token, id, merged);

  // 通信中にこの端末で編集された場合は、その編集を上書きしないよう取り込みを見送る
  // （次回の同期でマージされる）。
  if (pulled && localUpdatedAt() === startedAt) {
    applyLocal(merged);
    window.dispatchEvent(new Event(SYNC_APPLIED_EVENT));
  }
  markSynced();
  return { pulled, pushed };
}

/** 同期でローカルが書き換わったときに呼ばれるコールバックを登録する。 */
export function onSyncApplied(cb: () => void): () => void {
  window.addEventListener(SYNC_APPLIED_EVENT, cb);
  return () => window.removeEventListener(SYNC_APPLIED_EVENT, cb);
}
