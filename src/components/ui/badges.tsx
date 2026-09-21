import { cn } from "@/lib/utils/cn";
import { LEAD_STATUS_LABELS, LEAD_PRIORITY_LABELS } from "@/lib/constants/crm";
import type { LeadPriority, LeadStatus } from "@/lib/constants/crm";

const statusStyles: Record<LeadStatus, string> = {
  new: "bg-sky-50 text-sky-700 ring-sky-200",
  contacted: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  whatsapp_sent: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  meeting: "bg-violet-50 text-violet-700 ring-violet-200",
  demo: "bg-amber-50 text-amber-800 ring-amber-200",
  proposal: "bg-orange-50 text-orange-700 ring-orange-200",
  won: "bg-green-100 text-green-800 ring-green-300",
  lost: "bg-neutral-100 text-neutral-500 ring-neutral-200",
};

const priorityStyles: Record<LeadPriority, string> = {
  low: "bg-neutral-100 text-neutral-600 ring-neutral-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  high: "bg-red-50 text-red-700 ring-red-200",
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
