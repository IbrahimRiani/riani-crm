import { redirect } from "next/navigation";
import { getSessionUser, getUserRole } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const role = await getUserRole();
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar email={user.email} isAdmin={role === "admin"} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
