import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/header";
import { TaskSection } from "@/components/tasks/task-section";
import { Card } from "@/components/ui/card";
import type { TaskWithLead, Lead } from "@/types/crm";
import { todayMadridISO } from "@/lib/utils/format";

export default async function TasksPage() {
  const supabase = await createClient();
  const [{ data: tasks }, { data: leads }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, leads(id, company_name, status)")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("leads").select("id, company_name").order("company_name"),
  ]);

  const all = (tasks ?? []) as TaskWithLead[];
  const today = todayMadridISO();
  const overdue = all.filter((t) => !t.completed && t.due_date && t.due_date < today);
  const todayTasks = all.filter((t) => !t.completed && t.due_date === today);
  const upcoming = all.filter((t) => !t.completed && t.due_date && t.due_date > today);
  const noDate = all.filter((t) => !t.completed && !t.due_date);
  const done = all.filter((t) => t.completed);

  const leadOpts = (leads ?? []) as Pick<Lead, "id" | "company_name">[];

  return (
    <div>
      <PageHeader title="Seguimientos" subtitle="Qué toca hoy y qué está pendiente" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <TaskSection title="Atrasados" tasks={overdue} leads={leadOpts} />
        </Card>
        <Card className="p-5">
          <TaskSection title="Hoy" tasks={todayTasks} leads={leadOpts} />
        </Card>
        <Card className="p-5">
          <TaskSection title="Próximos + sin fecha" tasks={[...upcoming, ...noDate]} leads={leadOpts} />
        </Card>
        <Card className="p-5">
          <TaskSection title="Completados" tasks={done} leads={leadOpts} />
        </Card>
      </div>
    </div>
  );
}
