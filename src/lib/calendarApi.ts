/**
 * Google Calendar REST API の薄いラッパー。
 * アクセストークン（クライアントサイドOAuthで取得）を引数に取り、
 * ブラウザから直接 Calendar API を呼び出す。サーバー不要。
 */

const BASE = "https://www.googleapis.com/calendar/v3";

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  htmlLink?: string;
}

/** YYYY-MM-DD に日数を足した YYYY-MM-DD を返す。 */
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function request<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendar API error ${res.status}: ${text}`);
  }
  // DELETE は本文なし。
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** タスク締切を終日イベントとして Google カレンダーに登録し、イベントIDを返す。 */
export async function createEventForTask(
  accessToken: string,
  task: { title: string; description: string; dueDate: string; requiredSkills: string[] },
): Promise<GoogleCalendarEvent> {
  const body = buildEventBody(task);
  return request<GoogleCalendarEvent>(accessToken, "/calendars/primary/events", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** 既存イベントをタスク内容で更新する。 */
export async function updateEventForTask(
  accessToken: string,
  eventId: string,
  task: { title: string; description: string; dueDate: string; requiredSkills: string[] },
): Promise<GoogleCalendarEvent> {
  const body = buildEventBody(task);
  return request<GoogleCalendarEvent>(
    accessToken,
    `/calendars/primary/events/${encodeURIComponent(eventId)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

/** イベントを削除する。すでに無い場合(404/410)は成功扱いにする。 */
export async function deleteEvent(accessToken: string, eventId: string): Promise<void> {
  try {
    await request<void>(
      accessToken,
      `/calendars/primary/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE" },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("404") || msg.includes("410")) return;
    throw e;
  }
}

/** 指定期間（[timeMin, timeMax)）の予定一覧を取得する。 */
export async function listEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: `${timeMin}T00:00:00Z`,
    timeMax: `${timeMax}T00:00:00Z`,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });
  const data = await request<{ items?: GoogleCalendarEvent[] }>(
    accessToken,
    `/calendars/primary/events?${params.toString()}`,
  );
  return data.items ?? [];
}

function buildEventBody(task: {
  title: string;
  description: string;
  dueDate: string;
  requiredSkills: string[];
}) {
  const lines = [task.description];
  if (task.requiredSkills.length > 0) {
    lines.push("", `必要な知識・技術: ${task.requiredSkills.join(", ")}`);
  }
  lines.push("", "（Taskful から登録）");
  return {
    summary: `📋 ${task.title}`,
    description: lines.filter((l) => l !== undefined).join("\n"),
    // 終日イベント。end.date は排他的なので翌日にする。
    start: { date: task.dueDate },
    end: { date: addDays(task.dueDate, 1) },
  };
}

/** イベントの開始日（YYYY-MM-DD）を取り出す。終日/時刻指定どちらも対応。 */
export function eventStartDate(ev: GoogleCalendarEvent): string | null {
  if (ev.start?.date) return ev.start.date;
  if (ev.start?.dateTime) return ev.start.dateTime.slice(0, 10);
  return null;
}
