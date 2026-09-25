import { redirect } from "next/navigation";
import { createClient, getSessionUser, getUserRole } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/header";
import { UsersManager } from "@/components/users/users-manager";
import type { Profile } from "@/types/crm";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const role = await getUserRole();
  if (role !== "admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, role, created_at")
    .order("email");

  return (
    <div className="max-w-2xl">
      <PageHeader title="Usuarios" subtitle="Quién accede a la cartera compartida y con qué rol" />
      <UsersManager profiles={(data ?? []) as Profile[]} myId={user.id} />
    </div>
  );
}
