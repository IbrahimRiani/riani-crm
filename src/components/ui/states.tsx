import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800", className)} />;
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-14 text-center dark:border-neutral-700 dark:bg-neutral-900">
      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
