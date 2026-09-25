"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUserRole } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/crm";

/** Lista de usuarios (cualquier autenticado la necesita para asignar responsables). */
export async function listProfiles(): Promise<
  { ok: true; profiles: Profile[] } | { ok: false; error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role, created_at")
      .order("email");
    if (error) {
      console.error("[listProfiles]", error);
      return { ok: false, error: "No se pudieron cargar los usuarios." };
    }
    return { ok: true, profiles: (data ?? []) as Profile[] };
  } catch (e) {
    console.error("[listProfiles]", e);
    return { ok: false, error: "No se pudieron cargar los usuarios." };
  }
}

/** Cambiar rol (solo admin; nadie puede cambiar su propio rol para evitar bloqueos). */
export async function setUserRole(
  id: string,
  role: UserRole,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (role !== "admin" && role !== "member") {
      return { ok: false, error: "Rol no válido." };
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
    if ((await getUserRole()) !== "admin") {
      return { ok: false, error: "Solo un administrador puede cambiar roles." };
    }
    if (id === user.id) {
      return { ok: false, error: "No puedes cambiar tu propio rol." };
    }
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) {
      console.error("[setUserRole]", error);
      return { ok: false, error: "No se pudo cambiar el rol. Inténtalo de nuevo." };
    }
    revalidatePath("/users");
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    console.error("[setUserRole]", e);
    return { ok: false, error: "No se pudo cambiar el rol. Inténtalo de nuevo." };
  }
}
