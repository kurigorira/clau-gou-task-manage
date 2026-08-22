"use client";

import Link from "next/link";
import { useState } from "react";
import { useGoogle } from "@/lib/google";
import { useTasks } from "@/lib/store";
import type { Task } from "@/lib/types";
import {
  createEventForTask,
  updateEventForTask,
  deleteEvent,
} from "@/lib/calendarApi";

export function CalendarSync({ task }: { task: Task }) {
  const { isConnected, accessToken } = useGoogle();
  const { updateTask } = useTasks();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "カレンダー操作に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const payload = {
    title: task.title,
    description: task.description,
    dueDate: task.dueDate ?? "",
    requiredSkills: task.requiredSkills,
  };

  const register = () =>
    run(async () => {
      const ev = await createEventForTask(accessToken!, payload);
      updateTask(task.id, { googleEventId: ev.id });
    });

  const update = () =>
    run(async () => {
      await updateEventForTask(accessToken!, task.googleEventId!, payload);
    });

  const remove = () =>
    run(async () => {
      await deleteEvent(accessToken!, task.googleEventId!);
      updateTask(task.id, { googleEventId: null });
    });

  if (!isConnected) {
    return (
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <Link href="/settings" className="font-medium text-brand-600 hover:underline">
          設定でGoogle連携
        </Link>
        すると、締切をカレンダーに登録できます。
      </div>
    );
  }

  if (!task.dueDate) {
    return (
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        締切を設定すると、カレンダーに登録できます。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {task.googleEventId ? (
          <>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              ✓ カレンダー登録済み
            </span>
            <button
              onClick={update}
              disabled={busy}
              className="rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50"
            >
              内容を更新
            </button>
            <button
              onClick={remove}
              disabled={busy}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              登録を解除
            </button>
          </>
        ) : (
          <button
            onClick={register}
            disabled={busy}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "処理中..." : "📅 カレンダーに登録"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
