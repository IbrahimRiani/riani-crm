"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Lead, TaskWithLead } from "@/types/crm";
import { createTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea, Label, Select } from "@/components/ui/form";
import { TaskItem } from "@/components/tasks/task-item";
import { EmptyState } from "@/components/ui/states";

export function TaskSection({
  tasks,
  leads,
  presetLeadId,
  title = "Seguimientos",
}: {
  tasks: TaskWithLead[];
  leads: Pick<Lead, "id" | "company_name">[];
  presetLeadId?: string;
  title?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", due_date: "", description: "", lead_id: presetLeadId ?? "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!form.title.trim()) return;
    setPending(true);
    setError(null);
    const res = await createTask({
      title: form.title.trim(),
      description: form.description || undefined,
      due_date: form.due_date || undefined,
      lead_id: form.lead_id || undefined,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOpen(false);
    setForm({ title: "", due_date: "", description: "", lead_id: presetLeadId ?? "" });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">{title} ({tasks.length})</h2>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nueva
        </Button>
      </div>
      {tasks.length === 0 ? (
        <EmptyState title="Sin tareas" message="Crea un seguimiento para no perder ninguna oportunidad." />
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <TaskItem key={t.id} task={t} />
          ))}
        </div>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title="Nueva tarea">
        <div className="space-y-3">
          <div>
            <Label htmlFor="nt-title">Título *</Label>
            <Input
              id="nt-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Llamar a la clínica"
            />
          </div>
          {!presetLeadId && (
            <div>
              <Label htmlFor="nt-lead">Lead</Label>
              <Select id="nt-lead" value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value })}>
                <option value="">Sin lead asociado</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{l.company_name}</option>
                ))}
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="nt-date">Fecha vencimiento</Label>
            <Input id="nt-date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="nt-desc">Descripción</Label>
            <Textarea id="nt-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={pending || !form.title.trim()}>
              {pending ? "Guardando…" : "Crear"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
