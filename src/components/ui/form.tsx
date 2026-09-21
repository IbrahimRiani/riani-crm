import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900",
        "placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none",
        "disabled:bg-neutral-50 disabled:text-neutral-500",
        "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-white dark:disabled:bg-neutral-800",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-20 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900",
        "placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none",
        "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-white",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900",
        "focus:border-neutral-900 focus:outline-none",
        "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-white",
        className,
      )}
      {...props}
    />
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{message}</p>;
}
