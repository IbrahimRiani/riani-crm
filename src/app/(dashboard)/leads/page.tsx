import { createClient, getUserRole } from "@/lib/supabase/server";
import { LeadsExplorer } from "@/components/leads/leads-explorer";
import type { Lead, Profile } from "@/types/crm";

export default async function LeadsPage() {
  const supabase = await createClient();
  const [{ data, error }, { data: profiles }, role] = await Promise.all([
    supabase.from("leads").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, email, role, created_at").order("email"),
    getUserRole(),
  ]);

  if (error) {
    console.error("[LeadsPage]", error);
    return <p className="text-sm text-neutral-500">No se pudieron cargar los leads. Inténtalo de nuevo.</p>;
  }

  return (
    <LeadsExplorer
      leads={(data ?? []) as Lead[]}
      profiles={(profiles ?? []) as Profile[]}
      isAdmin={role === "admin"}
    />
  );
}
