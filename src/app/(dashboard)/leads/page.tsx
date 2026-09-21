import { createClient } from "@/lib/supabase/server";
import { LeadsExplorer } from "@/components/leads/leads-explorer";
import type { Lead } from "@/types/crm";

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[LeadsPage]", error);
    return <p className="text-sm text-neutral-500">No se pudieron cargar los leads. Inténtalo de nuevo.</p>;
  }

  return <LeadsExplorer leads={(data ?? []) as Lead[]} />;
}
