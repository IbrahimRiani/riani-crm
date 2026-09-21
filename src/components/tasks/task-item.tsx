"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Pencil, Trash2 } from "lucide-react";
import type { TaskWithLead } from "@/types/crm";
import { toggleTask, deleteTask, updateTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea, Label } from "@/components/ui/form";
import { relativeDayES } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function TaskItem({ task }: { task: TaskWithLead }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [due, setDue] = useState(task.due_date ?? "");
  const [desc, setDesc] = useState(task.description ?? "");

  async function toggle() {
    setPending(true);
    await toggleTask(task.id, !task.completed);
    setPending(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("¿Eliminar esta tarea?")) return;
    setPending(true);
    await deleteTask(task.id);
    setPending(false);
    router.refresh();
  }

  async function save() {
    setPending(true);
    await updateTask(task.id, {
      title,
      description: desc || undefined,
      due_date: due || undefined,
      lead_id: task.lead_id ?? undefined,
      completed: task.completed,
    });
    setPending(false);
    setEditOpen(false);
    router.refresh();
  }

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900", task.completed && "opacity-60")}>
      <button
        onClick={toggle}
        disabled={pending}
        aria-label={task.completed ? "Marcar como pendiente" : "Marcar como completada"}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
          task.completed ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 hover:border-neutral-900 dark:border-neutral-600 dark:hover:border-white",
        )}
      >
        {task.completed && <Check className="h-3.5 w-3.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium text-neutral-900 dark:text-neutral-100", task.completed && "line-through")}>{task.title}</p>
        {task.leads && (
          <Link href={`/leads/${task.leads.id}`} className="text-xs text-neutral-500 hover:text-neutral-900 hover:underline dark:text-neutral-400 dark:hover:text-neutral-100">
            {task.leads.company_name}
          </Link>
        )}
        {task.description && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{task.description}</p>}
        <p className="mt-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">{relativeDayES(task.due_date)}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} aria-label="Editar tarea">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={remove} aria-label="Eliminar tarea">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Editar tarea">
        <div className="space-y-3">
          <div>
            <Label htmlFor={`t-${task.id}`}>Título</Label>
            <Input id={`t-${task.id}`} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`d-${task.id}`}>Fecha</Label>
            <Input id={`d-${task.id}`} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`n-${task.id}`}>Descripción</Label>
            <Textarea id={`n-${task.id}`} value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={pending || !title.trim()}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
