import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, Phone, Mail, MapPin, CalendarDays, Euro, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge, PriorityBadge } from "@/components/ui/badges";
import { Card } from "@/components/ui/card";
import { LeadActions } from "@/components/leads/lead-actions";
import { Timeline } from "@/components/activities/timeline";
import { TaskSection } from "@/components/tasks/task-section";
import { formatEUR, formatDateES } from "@/lib/utils/format";
import { LEAD_SOURCE_LABELS } from "@/lib/constants/crm";
import type { Activity, Lead, TaskWithLead } from "@/types/crm";

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
      <div className="min-w-0">
        <p className="text-xs text-neutral-500">{label}</p>
        <div className="truncate text-sm font-medium text-neutral-900">{value}</div>
      </div>
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead, error } = await supabase.from("leads").select("*").eq("id", id).single();
  if (error || !lead) notFound();

  const l = lead as Lead;
  const [{ data: activities }, { data: tasks }, { data: allLeads }] = await Promise.all([
    supabase.from("activities").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*, leads(id, company_name, status)").eq("lead_id", id).order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("leads").select("id, company_name").order("company_name"),
  ]);

  return (
    <div>
      <Link href="/leads" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
        <ArrowLeft className="h-4 w-4" /> Volver a leads
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{l.company_name}</h1>
        <StatusBadge status={l.status} />
        <PriorityBadge priority={l.priority} />
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        {[l.business_type, l.city, l.province].filter(Boolean).join(" · ")}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <LeadActions lead={l} />
          </Card>
          <div>
            <h2 className="mb-3 text-sm font-semibold">Historial</h2>
            <Timeline activities={(activities ?? []) as Activity[]} />
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-2 text-sm font-semibold">Información</h2>
            <Row icon={User} label="Contacto" value={l.contact_name ?? "—"} />
            <Row icon={Phone} label="Teléfono / WhatsApp" value={[l.phone, l.whatsapp].filter(Boolean).join(" · ") || "—"} />
            <Row icon={Mail} label="Email" value={l.email ?? "—"} />
            <Row icon={Globe} label="Web" value={l.website ? <a href={l.website} target="_blank" rel="noreferrer" className="hover:underline">{l.website}</a> : "—"} />
            <Row icon={MapPin} label="Ubicación" value={[l.city, l.province].filter(Boolean).join(", ") || "—"} />
            <Row icon={Euro} label="Valor potencial" value={formatEUR(l.deal_value)} />
            <Row icon={CalendarDays} label="Próximo seguimiento" value={formatDateES(l.next_follow_up)} />
            <div className="pt-2 text-xs text-neutral-500">
              Fuente: {LEAD_SOURCE_LABELS[l.source]} · Creado: {formatDateES(l.created_at)}
            </div>
            {l.notes && (
              <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">{l.notes}</div>
            )}
          </Card>

          <Card className="p-5">
            <TaskSection
              title="Seguimientos del lead"
              tasks={(tasks ?? []) as TaskWithLead[]}
              leads={allLeads ?? []}
              presetLeadId={l.id}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
