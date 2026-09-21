import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { PageHeader } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-lg">
      <PageHeader title="Configuración" subtitle="Tu cuenta" />
      <Card className="p-5">
        <p className="text-xs text-neutral-500">Email</p>
        <p className="text-sm font-medium">{user.email}</p>
        <p className="mt-1 text-xs text-neutral-500">ID: {user.id}</p>
        <form action={signOut} className="mt-5">
          <Button variant="outline" type="submit">Cerrar sesión</Button>
        </form>
      </Card>
    </div>
  );
}
