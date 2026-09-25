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
import { findDuplicateGroups } from "@/lib/utils/import";

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
  const dupGroups = findDuplicateGroups(
    leads.map((l) => ({
      id: l.id,
      company_name: l.company_name,
      phone: l.phone,
      whatsapp: l.whatsapp,
      website: l.website,
      created_at: l.created_at,
    })),
  );
  const dupCount = dupGroups.reduce((s, g) => s + g.leads.length - 1, 0);

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
          <div className="border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Seguimientos de hoy ({followUpsToday.length + todaysTasks.length})</h2>
          </div>
          <div className="divide-y divide-neutral-50 px-5 dark:divide-neutral-800">
            {followUpsToday.length === 0 && todaysTasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">Nada pendiente para hoy. Buen momento para prospectar.</p>
            ) : (
              <>
                {followUpsToday.map((l) => (
                  <Link key={l.id} href={`/leads/${l.id}`} className="flex items-center justify-between gap-2 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{l.company_name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{l.contact_name ?? "Sin contacto"}</p>
                    </div>
                    <StatusBadge status={l.status} />
                  </Link>
                ))}
                {todaysTasks.map((t) => (
                  <Link key={t.id} href={t.lead_id ? `/leads/${t.lead_id}` : "/tasks"} className="flex items-center justify-between gap-2 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">✓ {t.title}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.leads?.company_name ?? "Sin empresa"}</p>
                    </div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{relativeDayES(t.due_date)}</span>
                  </Link>
                ))}
              </>
            )}
          </div>
        </Card>

        <Card>
          <div className="border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Pipeline por etapa</h2>
          </div>
          <div className="space-y-2 px-5 py-4">
            {LEAD_STATUSES.map((s) => {
              const n = count(s.value);
              const pct = leads.length ? Math.round((n / leads.length) * 100) : 0;
              return (
                <Link key={s.value} href="/pipeline" className="block">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700 dark:text-neutral-300">{s.label}</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">{n}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div className="h-full rounded-full bg-neutral-900 dark:bg-white" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      {dupCount > 0 && (
        <Card className="mt-4 border-amber-200 dark:border-amber-900">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Posibles duplicados ({dupCount} en {dupGroups.length} grupos)
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Leads que comparten teléfono o web. Revisa cuál conservar de cada grupo.
              </p>
            </div>
            <Link href="/leads#importar"><Button size="sm" variant="outline">Revisar</Button></Link>
          </div>
        </Card>
      )}

      {overdueTasks.length > 0 && (
        <Card className="mt-4 border-red-200 dark:border-red-900">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">Atrasados ({overdueTasks.length})</h2>
            <div className="mt-2 space-y-1">
              {overdueTasks.slice(0, 5).map((t) => (
                <Link key={t.id} href={t.lead_id ? `/leads/${t.lead_id}` : "/tasks"} className="block text-sm text-neutral-700 hover:underline dark:text-neutral-300">
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
