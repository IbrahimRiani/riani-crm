"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Lead } from "@/types/crm";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/constants/crm";
import { PriorityBadge } from "@/components/ui/badges";
import { moveLeadStatus } from "@/lib/actions/leads";
import { formatEUR, relativeDayES } from "@/lib/utils/format";
import { useRouter } from "next/navigation";

function Card({ lead }: { lead: Lead }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { status: lead.status },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => router.push(`/leads/${lead.id}`)}
      className={`cursor-grab rounded-xl border border-neutral-200 bg-white p-3 shadow-sm transition-shadow hover:shadow active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <p className="text-sm font-semibold text-neutral-900">{lead.company_name}</p>
      <p className="text-xs text-neutral-500">{[lead.business_type, lead.city].filter(Boolean).join(" · ") || "—"}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={lead.priority} />
        {lead.deal_value ? <span className="text-xs font-semibold">{formatEUR(lead.deal_value)}</span> : null}
      </div>
      {lead.next_follow_up && (
        <p className="mt-1 text-xs text-neutral-500">↻ {relativeDayES(lead.next_follow_up)}</p>
      )}
    </div>
  );
}

function Column({ status, leads }: { status: LeadStatus; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const total = leads.reduce((s, l) => s + (l.deal_value ?? 0), 0);
  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col rounded-xl border p-2 ${
        isOver ? "border-neutral-900 bg-neutral-100" : "border-neutral-200 bg-neutral-50"
      }`}
    >
      <div className="px-2 py-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
          {LEAD_STATUSES.find((s) => s.value === status)?.label}
        </p>
        <p className="text-xs text-neutral-500">{leads.length} · {formatEUR(total)}</p>
      </div>
      <div className="min-h-24 flex-1 space-y-2">
        {leads.map((l) => (
          <Card key={l.id} lead={l} />
        ))}
      </div>
    </div>
  );
}

export function PipelineBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [active, setActive] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onStart(e: DragStartEvent) {
    setActive(leads.find((l) => l.id === e.active.id) ?? null);
  }

  async function onEnd(e: DragEndEvent) {
    setActive(null);
    const { active: a, over } = e;
    if (!over) return;
    const to = over.id as LeadStatus;
    const lead = leads.find((l) => l.id === a.id);
    if (!lead || lead.status === to) return;
    const from = lead.status;
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: to } : l)));
    const res = await moveLeadStatus(lead.id, from, to);
    if (!res.ok) {
      setError(res.error);
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: from } : l)));
    } else {
      router.refresh();
    }
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <DndContext sensors={sensors} onDragStart={onStart} onDragEnd={onEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {LEAD_STATUSES.map((s) => (
            <Column key={s.value} status={s.value} leads={leads.filter((l) => l.status === s.value)} />
          ))}
        </div>
        <DragOverlay>
          {active ? (
            <div className="w-64 rounded-xl border border-neutral-900 bg-white p-3 shadow-lg">
              <p className="text-sm font-semibold">{active.company_name}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
