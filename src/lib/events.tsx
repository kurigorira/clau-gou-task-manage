"use client";

/**
 * 行事予定（会社・プライベート）のローカルストア。
 * タスクとは別に、日付＋タイトルだけの軽いイベントを localStorage で管理する。
 * ICSファイル（Outlook/Googleカレンダー等の書き出し形式）からの一括取り込みに対応。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { touchLocalData } from "./driveSync";

export type EventCategory = "company" | "private";

export interface CalEvent {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  category: EventCategory;
}

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  company: "会社",
  private: "プライベート",
};

const STORAGE_KEY = "atlas-events-v1";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface EventsContextValue {
  events: CalEvent[];
  ready: boolean;
  addEvent: (e: Omit<CalEvent, "id">) => void;
  deleteEvent: (id: string) => void;
  /** 指定カテゴリの予定を全削除（再取り込み前の掃除に使う）。 */
  clearCategory: (c: EventCategory) => void;
  /** 一括取り込み。同じ日付＋タイトルはスキップし、追加/スキップ件数を返す。 */
  importEvents: (items: Omit<CalEvent, "id">[]) => { added: number; skipped: number };
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setEvents(JSON.parse(raw) as CalEvent[]);
    } catch {
      /* 壊れたデータは無視 */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      /* 保存できない環境ではスキップ */
    }
  }, [events, ready]);

  const addEvent = useCallback<EventsContextValue["addEvent"]>((e) => {
    setEvents((prev) => [...prev, { ...e, id: createId() }]);
    touchLocalData();
  }, []);

  const deleteEvent = useCallback<EventsContextValue["deleteEvent"]>((id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    touchLocalData();
  }, []);

  const clearCategory = useCallback<EventsContextValue["clearCategory"]>((c) => {
    setEvents((prev) => prev.filter((e) => e.category !== c));
    touchLocalData();
  }, []);

  const importEvents = useCallback<EventsContextValue["importEvents"]>(
    (items) => {
      const seen = new Set(events.map((e) => `${e.date}|${e.title}`));
      const fresh: CalEvent[] = [];
      let skipped = 0;
      for (const item of items) {
        const key = `${item.date}|${item.title}`;
        if (seen.has(key)) {
          skipped++;
          continue;
        }
        seen.add(key);
        fresh.push({ ...item, id: createId() });
      }
      if (fresh.length > 0) {
        setEvents((prev) => [...prev, ...fresh]);
        touchLocalData();
      }
      return { added: fresh.length, skipped };
    },
    [events],
  );

  const value = useMemo<EventsContextValue>(
    () => ({ events, ready, addEvent, deleteEvent, clearCategory, importEvents }),
    [events, ready, addEvent, deleteEvent, clearCategory, importEvents],
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents(): EventsContextValue {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEvents は EventProvider の内側で使ってください");
  return ctx;
}

/** ICSテキストから { title, date } の配列を取り出す（開始日のみ・終日/時刻付き両対応）。 */
export function parseIcs(text: string): { title: string; date: string }[] {
  // 折り返し行（次行頭の空白/タブ）を結合してから行分割する。
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const out: { title: string; date: string }[] = [];
  let inEvent = false;
  let title = "";
  let date = "";
  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      inEvent = true;
      title = "";
      date = "";
      continue;
    }
    if (line.startsWith("END:VEVENT")) {
      if (inEvent && title && date) out.push({ title, date });
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).split(";")[0].toUpperCase();
    const value = line.slice(colon + 1);
    if (key === "SUMMARY") {
      title = value
        .replace(/\\n/g, " ")
        .replace(/\\,/g, ",")
        .replace(/\\;/g, ";")
        .replace(/\\\\/g, "\\")
        .trim();
    } else if (key === "DTSTART") {
      const m = value.match(/(\d{4})(\d{2})(\d{2})/);
      if (m) date = `${m[1]}-${m[2]}-${m[3]}`;
    }
  }
  return out;
}
