import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { PageHeader } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-lg">
      <PageHeader title="Configuración" subtitle="Tu cuenta" />
      <Card className="p-5">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Email</p>
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{user.email}</p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">ID: {user.id}</p>
        <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <p className="mb-1 px-0 text-xs text-neutral-500 dark:text-neutral-400">Apariencia</p>
          <div className="-ml-3"><ThemeToggle /></div>
        </div>
        <form action={signOut} className="mt-4">
          <Button variant="outline" type="submit">Cerrar sesión</Button>
        </form>
      </Card>
    </div>
  );
}
