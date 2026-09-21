"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, MessageCircle, Pencil, Trash2, Plus, StickyNote, CalendarCheck } from "lucide-react";
import type { Lead } from "@/types/crm";
import { LEAD_STATUSES } from "@/lib/constants/crm";
import { whatsappUrl } from "@/lib/utils/whatsapp";
import { deleteLead, updateLead } from "@/lib/actions/leads";
import { createActivity } from "@/lib/actions/activities";
import { createTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Input, Textarea, Label, Select } from "@/components/ui/form";
import { LeadForm } from "@/components/leads/lead-form";

const QUICK_TYPES = [
  { value: "note", label: "Nota", icon: StickyNote },
  { value: "call", label: "Llamada", icon: Phone },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Reunión", icon: CalendarCheck },
] as const;

export function LeadActions({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activityType, setActivityType] = useState<string | null>(null);
  const [activityText, setActivityText] = useState("");
  const [activityPending, setActivityPending] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskPending, setTaskPending] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wa = whatsappUrl(lead.whatsapp ?? lead.phone);

  async function saveActivity() {
    if (!activityType) return;
    setActivityPending(true);
    setError(null);
    const res = await createActivity({
      lead_id: lead.id,
      type: activityType,
      description: activityText || undefined,
    });
    setActivityPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setActivityType(null);
    setActivityText("");
    router.refresh();
  }

  async function saveTask() {
    if (!taskTitle.trim()) return;
    setTaskPending(true);
    setError(null);
    const res = await createTask({
      title: taskTitle.trim(),
      due_date: taskDate || undefined,
      lead_id: lead.id,
    });
    setTaskPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setTaskOpen(false);
    setTaskTitle("");
    setTaskDate("");
    router.refresh();
  }

  async function changeStatus(next: string) {
    setStatusPending(true);
    const res = await updateLead(lead.id, {
      company_name: lead.company_name,
      business_type: lead.business_type ?? "",
      contact_name: lead.contact_name ?? "",
      phone: lead.phone ?? "",
      whatsapp: lead.whatsapp ?? "",
      email: lead.email ?? "",
      website: lead.website ?? "",
      city: lead.city ?? "",
      province: lead.province ?? "",
      status: next,
      priority: lead.priority,
      source: lead.source,
      deal_value: lead.deal_value ?? undefined,
      next_follow_up: lead.next_follow_up ?? "",
      notes: lead.notes ?? "",
    });
    // Registrar cambio de estado como actividad
    if (res.ok && next !== lead.status) {
      await createActivity({
        lead_id: lead.id,
        type: "status_change",
        description: `Estado cambiado a ${LEAD_STATUSES.find((s) => s.value === next)?.label ?? next}`,
      });
    }
    setStatusPending(false);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  async function confirmDelete() {
    setDeleting(true);
    const res = await deleteLead(lead.id);
    if (!res.ok) {
      setError(res.error);
      setDeleting(false);
      return;
    }
    router.push("/leads");
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer">
            <Button size="sm"><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
          </a>
        )}
        {lead.phone && (
          <a href={`tel:${lead.phone.replace(/\s/g, "")}`}>
            <Button size="sm" variant="outline"><Phone className="h-4 w-4" /> Llamar</Button>
          </a>
        )}
        {lead.email && (
          <a href={`mailto:${lead.email}`}>
            <Button size="sm" variant="outline"><Mail className="h-4 w-4" /> Email</Button>
          </a>
        )}
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Editar
        </Button>
        <Button size="sm" variant="outline" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4" /> Eliminar
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Label htmlFor="lead-status" className="!mb-0">Estado:</Label>
        <Select
          id="lead-status"
          value={lead.status}
          disabled={statusPending}
          onChange={(e) => changeStatus(e.target.value)}
          className="!w-auto"
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
      </div>

      <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
        <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">REGISTRAR ACTIVIDAD</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <Button key={t.value} size="sm" variant="secondary" onClick={() => setActivityType(t.value)}>
                <Icon className="h-4 w-4" /> {t.label}
              </Button>
            );
          })}
          <Button size="sm" variant="secondary" onClick={() => setTaskOpen(true)}>
            <Plus className="h-4 w-4" /> Seguimiento
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>
      )}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Editar lead" wide>
        <LeadForm lead={lead} onDone={() => setEditOpen(false)} />
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        pending={deleting}
        title="¿Eliminar este lead?"
        message="Esta acción eliminará también sus actividades y seguimientos."
      />

      <Dialog
        open={activityType !== null}
        onClose={() => setActivityType(null)}
        title={`Registrar: ${QUICK_TYPES.find((t) => t.value === activityType)?.label ?? ""}`}
      >
        <Label htmlFor="activity-desc">Descripción</Label>
        <Textarea
          id="activity-desc"
          value={activityText}
          onChange={(e) => setActivityText(e.target.value)}
          placeholder="Qué ocurrió…"
          rows={4}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setActivityType(null)}>Cancelar</Button>
          <Button onClick={saveActivity} disabled={activityPending}>
            {activityPending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </Dialog>

      <Dialog open={taskOpen} onClose={() => setTaskOpen(false)} title="Crear seguimiento">
        <div className="space-y-3">
          <div>
            <Label htmlFor="task-title">Título *</Label>
            <Input
              id="task-title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Volver a llamar a la clínica"
            />
          </div>
          <div>
            <Label htmlFor="task-date">Fecha</Label>
            <Input id="task-date" type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTaskOpen(false)}>Cancelar</Button>
            <Button onClick={saveTask} disabled={taskPending || !taskTitle.trim()}>
              {taskPending ? "Guardando…" : "Crear"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
