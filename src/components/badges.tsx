import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";

const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "border-slate-700 text-slate-400",
  "in-progress": "border-brand-500/40 text-brand-300",
  done: "border-emerald-500/40 text-emerald-300",
};

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  high: "border-rose-500/40 text-rose-300",
  medium: "border-amber-500/40 text-amber-300",
  low: "border-slate-700 text-slate-400",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${PRIORITY_STYLE[priority]}`}
    >
      優先度: {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function SkillTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-brand-500/30 bg-brand-500/10 px-2 py-1 font-mono text-[11px] text-brand-300">
      {children}
    </span>
  );
}
