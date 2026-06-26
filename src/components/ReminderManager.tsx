"use client";

import { useEffect } from "react";
import { useTasks } from "@/lib/store";
import { daysUntil } from "@/lib/date";
import { isNotifyEnabled, shouldNotifyToday } from "@/lib/notify";

const BASE = process.env.NODE_ENV === "production" ? "/clau-gou-task-manage" : "";

/**
 * 締切が今日・超過の未完了タスクを、アプリ起動時に1日1回だけ通知する。
 * 通知が有効（設定で許可済み）かつ Notification 権限がある場合のみ動作。
 */
export function ReminderManager() {
  const { tasks, ready } = useTasks();

  useEffect(() => {
    if (!ready) return;
    if (typeof Notification === "undefined") return;
    if (!isNotifyEnabled() || Notification.permission !== "granted") return;

    const open = tasks.filter((t) => t.status !== "done");
    let overdue = 0;
    let today = 0;
    for (const t of open) {
      const d = daysUntil(t.dueDate);
      if (d === null) continue;
      if (d < 0) overdue++;
      else if (d === 0) today++;
    }
    if (overdue + today === 0) return;
    if (!shouldNotifyToday()) return;

    const parts: string[] = [];
    if (overdue > 0) parts.push(`超過 ${overdue}件`);
    if (today > 0) parts.push(`今日締切 ${today}件`);

    try {
      new Notification("Atlas Lite — 締切リマインダー", {
        body: parts.join(" / "),
        icon: `${BASE}/icon.svg`,
        tag: "taskful-due",
      });
    } catch {
      /* noop */
    }
  }, [ready, tasks]);

  return null;
}
