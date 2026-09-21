import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/header";
import { Stat } from "@/components/ui/card";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { formatEUR, relativeDayES } from "@/lib/utils/format";
import { LEAD_STATUSES } from "@/lib/constants/crm";
import { todayMadridISO } from "@/lib/utils/format";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: leads } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, leads(id, company_name, status)")
    .eq("completed", false)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (!leads) {
    return <p className="text-sm text-neutral-500">No se pudieron cargar los datos. Inténtalo de nuevo.</p>;
  }

  const count = (s: string) => leads.filter((l) => l.status === s).length;
  const pipeline = leads
    .filter((l) => !["won", "lost"].includes(l.status))
    .reduce((sum, l) => sum + (l.deal_value ?? 0), 0);
  const wonValue = leads.filter((l) => l.status === "won").reduce((s, l) => s + (l.deal_value ?? 0), 0);
  const today = todayMadridISO();
  const todaysTasks = (tasks ?? []).filter((t) => t.due_date === today);
  const overdueTasks = (tasks ?? []).filter((t) => t.due_date && t.due_date < today);

  const followUpsToday = leads.filter((l) => l.next_follow_up === today).slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Tu actividad comercial de un vistazo"
        action={
          <Link href="/leads"><Button size="sm"><Plus className="h-4 w-4" /> Nuevo lead</Button></Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total leads" value={String(leads.length)} />
        <Stat label="Nuevos" value={String(count("new"))} />
        <Stat label="Propuestas" value={String(count("proposal"))} />
        <Stat label="Ganados" value={String(count("won"))} sub={formatEUR(wonValue)} />
        <Stat label="Contactados" value={String(count("contacted") + count("whatsapp_sent"))} />
        <Stat label="Demos" value={String(count("demo"))} />
        <Stat label="Pipeline abierto" value={formatEUR(pipeline)} />
        <Stat label="Seguimientos pendientes" value={String((tasks ?? []).length)} sub={`${overdueTasks.length} atrasados`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="border-b border-neutral-100 px-5 py-4">
            <h2 className="text-sm font-semibold">Seguimientos de hoy ({followUpsToday.length + todaysTasks.length})</h2>
          </div>
          <div className="divide-y divide-neutral-50 px-5">
            {followUpsToday.length === 0 && todaysTasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500">Nada pendiente para hoy. Buen momento para prospectar.</p>
            ) : (
              <>
                {followUpsToday.map((l) => (
                  <Link key={l.id} href={`/leads/${l.id}`} className="flex items-center justify-between gap-2 py-3 hover:bg-neutral-50">
                    <div>
                      <p className="text-sm font-medium">{l.company_name}</p>
                      <p className="text-xs text-neutral-500">{l.contact_name ?? "Sin contacto"}</p>
                    </div>
                    <StatusBadge status={l.status} />
                  </Link>
                ))}
                {todaysTasks.map((t) => (
                  <Link key={t.id} href={t.lead_id ? `/leads/${t.lead_id}` : "/tasks"} className="flex items-center justify-between gap-2 py-3 hover:bg-neutral-50">
                    <div>
                      <p className="text-sm font-medium">✓ {t.title}</p>
                      <p className="text-xs text-neutral-500">{t.leads?.company_name ?? "Sin empresa"}</p>
                    </div>
                    <span className="text-xs text-neutral-500">{relativeDayES(t.due_date)}</span>
                  </Link>
                ))}
              </>
            )}
          </div>
        </Card>

        <Card>
          <div className="border-b border-neutral-100 px-5 py-4">
            <h2 className="text-sm font-semibold">Pipeline por etapa</h2>
          </div>
          <div className="space-y-2 px-5 py-4">
            {LEAD_STATUSES.map((s) => {
              const n = count(s.value);
              const pct = leads.length ? Math.round((n / leads.length) * 100) : 0;
              return (
                <Link key={s.value} href="/pipeline" className="block">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700">{s.label}</span>
                    <span className="font-semibold">{n}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                    <div className="h-full rounded-full bg-neutral-900" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      {overdueTasks.length > 0 && (
        <Card className="mt-4 border-red-200">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-red-700">Atrasados ({overdueTasks.length})</h2>
            <div className="mt-2 space-y-1">
              {overdueTasks.slice(0, 5).map((t) => (
                <Link key={t.id} href={t.lead_id ? `/leads/${t.lead_id}` : "/tasks"} className="block text-sm hover:underline">
                  {t.title} · {t.leads?.company_name ?? "—"} · {relativeDayES(t.due_date)}
                </Link>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
