import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";

const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-600",
  "in-progress": "bg-blue-100 text-blue-700",
  done: "bg-emerald-100 text-emerald-700",
};

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  high: "bg-rose-100 text-rose-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-500",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_STYLE[priority]}`}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function SkillTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-lg bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
      {children}
    </span>
  );
}
