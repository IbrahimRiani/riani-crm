import { Phone, Mail, MessageCircle, StickyNote, CalendarCheck, ArrowRightLeft } from "lucide-react";
import type { Activity } from "@/types/crm";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants/crm";
import { formatDateTimeES } from "@/lib/utils/format";

const ICONS = {
  note: StickyNote,
  call: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  meeting: CalendarCheck,
  status_change: ArrowRightLeft,
} as const;

export function Timeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        Sin actividad todavía. Registra la primera acción con los botones de arriba.
      </p>
    );
  }
  return (
    <ol className="relative space-y-0 border-l border-neutral-200 pl-0 dark:border-neutral-800">
      {activities.map((a) => {
        const Icon = ICONS[a.type];
        return (
          <li key={a.id} className="relative pb-6 pl-8 last:pb-0">
            <span className="absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
              <Icon className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
            </span>
            <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{ACTIVITY_TYPE_LABELS[a.type]}</p>
                <time className="text-xs text-neutral-500 dark:text-neutral-400">{formatDateTimeES(a.created_at)}</time>
              </div>
              {a.description && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{a.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
