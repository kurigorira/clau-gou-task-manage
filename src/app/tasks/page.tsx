"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTasks } from "@/lib/store";
import { useGoogle } from "@/lib/google";
import { deleteEvent } from "@/lib/calendarApi";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  STATUS_ORDER,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";
import { formatJaDate, daysUntil } from "@/lib/date";
import { StatusBadge, PriorityBadge, SkillTag } from "@/components/badges";
import { Modal } from "@/components/Modal";
import { TaskForm, type TaskFormValues } from "@/components/TaskForm";
import { TaskDetail } from "@/components/TaskDetail";

type View = "list" | "board";
type ModalState =
  | { type: "none" }
  | { type: "create" }
  | { type: "detail"; id: string }
  | { type: "edit"; id: string };

function TasksPageInner() {
  const { tasks, ready, addTask, updateTask, deleteTask, getTask } = useTasks();
  const { isConnected, accessToken } = useGoogle();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>("list");
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (q) {
        const hay = [t.title, t.description, t.knowledgeNotes, ...t.requiredSkills, ...t.tags]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, query, statusFilter, priorityFilter]);

  const hasFilter = query.trim() !== "" || statusFilter !== "all" || priorityFilter !== "all";

  // ホームの「+ 新しいタスク」から ?new=1 で来たら作成フォームを開く。
  useEffect(() => {
    if (searchParams.get("new") !== null) {
      setModal({ type: "create" });
    }
  }, [searchParams]);

  const close = () => setModal({ type: "none" });

  const handleCreate = (values: TaskFormValues) => {
    addTask({ ...values, googleEventId: null });
    close();
  };

  const handleEdit = (id: string, values: TaskFormValues) => {
    updateTask(id, values);
    setModal({ type: "detail", id });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("このタスクを削除しますか？")) return;
    const task = getTask(id);
    // 連携中で登録済みイベントがあれば、カレンダー側も削除する（失敗しても続行）。
    if (task?.googleEventId && isConnected && accessToken) {
      void deleteEvent(accessToken, task.googleEventId).catch(() => undefined);
    }
    deleteTask(id);
    close();
  };

  const selected =
    modal.type === "detail" || modal.type === "edit" ? getTask(modal.id) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">タスク</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {!ready
              ? "読み込み中..."
              : hasFilter
                ? `${filtered.length} / ${tasks.length} 件`
                : `${tasks.length} 件のタスク`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5">
            <ViewButton active={view === "list"} onClick={() => setView("list")}>
              リスト
            </ViewButton>
            <ViewButton active={view === "board"} onClick={() => setView("board")}>
              カンバン
            </ViewButton>
          </div>
          <button
            onClick={() => setModal({ type: "create" })}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            + タスク追加
          </button>
        </div>
      </div>

      {ready && tasks.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="タイトル・スキル・タグで検索..."
            className="input sm:flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "all")}
            className="input sm:w-40"
          >
            <option value="all">状態: すべて</option>
            <option value="todo">未着手</option>
            <option value="in-progress">進行中</option>
            <option value="done">完了</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "all")}
            className="input sm:w-40"
          >
            <option value="all">優先度: すべて</option>
            {(["high", "medium", "low"] as TaskPriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
      )}

      {!ready ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">読み込み中...</p>
      ) : tasks.length === 0 ? (
        <EmptyState onCreate={() => setModal({ type: "create" })} />
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-12 text-center text-sm text-slate-500 dark:text-slate-400">
          条件に一致するタスクがありません。
        </p>
      ) : view === "list" ? (
        <ListView tasks={filtered} onSelect={(id) => setModal({ type: "detail", id })} />
      ) : (
        <BoardView
          tasks={filtered}
          onSelect={(id) => setModal({ type: "detail", id })}
          onMove={(id, status) => updateTask(id, { status })}
        />
      )}

      <Modal open={modal.type === "create"} onClose={close} title="新しいタスク">
        <TaskForm onSubmit={handleCreate} onCancel={close} submitLabel="追加" />
      </Modal>

      <Modal
        open={modal.type === "detail" && !!selected}
        onClose={close}
        title={selected?.title ?? ""}
      >
        {selected && (
          <TaskDetail
            task={selected}
            onEdit={() => setModal({ type: "edit", id: selected.id })}
            onDelete={() => handleDelete(selected.id)}
          />
        )}
      </Modal>

      <Modal
        open={modal.type === "edit" && !!selected}
        onClose={() => selected && setModal({ type: "detail", id: selected.id })}
        title="タスクを編集"
      >
        {selected && (
          <TaskForm
            initial={selected}
            onSubmit={(values) => handleEdit(selected.id, values)}
            onCancel={() => setModal({ type: "detail", id: selected.id })}
          />
        )}
      </Modal>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function ListView({
  tasks,
  onSelect,
}: {
  tasks: Task[];
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <li key={task.id}>
          <button
            onClick={() => onSelect(task.id)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
                {task.description && (
                  <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                    {task.description}
                  </p>
                )}
              </div>
              <DueChip due={task.dueDate} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              {task.requiredSkills.slice(0, 3).map((s) => (
                <SkillTag key={s}>{s}</SkillTag>
              ))}
              {task.requiredSkills.length > 3 && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  +{task.requiredSkills.length - 3}
                </span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function BoardView({
  tasks,
  onSelect,
  onMove,
}: {
  tasks: Task[];
  onSelect: (id: string) => void;
  onMove: (id: string, status: TaskStatus) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {STATUS_ORDER.map((status) => {
        const column = tasks.filter((t) => t.status === status);
        return (
          <div key={status} className="rounded-xl bg-slate-100/70 dark:bg-slate-800/60 p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {STATUS_LABEL[status]}
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">{column.length}</span>
            </div>
            <div className="space-y-2">
              {column.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm"
                >
                  <button
                    onClick={() => onSelect(task.id)}
                    className="text-left text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-brand-300"
                  >
                    {task.title}
                  </button>
                  <div className="mt-2 flex items-center justify-between">
                    <PriorityBadge priority={task.priority} />
                    <DueChip due={task.dueDate} compact />
                  </div>
                  <div className="mt-2 flex gap-1">
                    {STATUS_ORDER.filter((s) => s !== status).map((s) => (
                      <button
                        key={s}
                        onClick={() => onMove(task.id, s)}
                        className="rounded bg-slate-100 dark:bg-slate-700 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-brand-500/20 hover:text-brand-300"
                      >
                        → {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {column.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-slate-400 dark:text-slate-500">なし</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DueChip({ due, compact }: { due: string | null; compact?: boolean }) {
  if (!due) return null;
  const d = daysUntil(due);
  const color =
    d === null
      ? "text-slate-500 dark:text-slate-400"
      : d < 0
        ? "text-rose-400"
        : d <= 2
          ? "text-amber-600"
          : "text-slate-500 dark:text-slate-400";
  return (
    <span className={`shrink-0 text-xs font-medium ${color}`}>
      {compact ? formatJaDate(due) : `📅 ${formatJaDate(due)}`}
    </span>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-12 text-center">
      <p className="text-slate-600 dark:text-slate-300">まだタスクがありません。</p>
      <button
        onClick={onCreate}
        className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
      >
        + 最初のタスクを追加
      </button>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500 dark:text-slate-400">読み込み中...</p>}>
      <TasksPageInner />
    </Suspense>
  );
}
