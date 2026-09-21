import { cn } from "@/lib/utils/cn";
import { LEAD_STATUS_LABELS, LEAD_PRIORITY_LABELS } from "@/lib/constants/crm";
import type { LeadPriority, LeadStatus } from "@/lib/constants/crm";

const statusStyles: Record<LeadStatus, string> = {
  new: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  contacted: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30",
  whatsapp_sent: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  meeting: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30",
  demo: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  proposal: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30",
  won: "bg-green-100 text-green-800 ring-green-300 dark:bg-green-500/15 dark:text-green-300 dark:ring-green-500/30",
  lost: "bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-500/10 dark:text-neutral-400 dark:ring-neutral-500/30",
};

const priorityStyles: Record<LeadPriority, string> = {
  low: "bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-500/10 dark:text-neutral-400 dark:ring-neutral-500/30",
  medium: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  high: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        statusStyles[status],
      )}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: LeadPriority }) {
  const labels = LEAD_PRIORITY_LABELS;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        priorityStyles[priority],
      )}
    >
      {labels[priority]}
    </span>
  );
}
