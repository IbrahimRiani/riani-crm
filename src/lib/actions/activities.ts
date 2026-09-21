"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { activitySchema } from "@/lib/validations/activity";
import type { ActionResult } from "@/lib/actions/leads";

export async function createActivity(input: unknown): Promise<ActionResult> {
  try {
    const parsed = activitySchema.safeParse(input);
    if (!parsed.success)
      return { ok: false, error: "No se pudo registrar la actividad. Revisa los datos." };
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
    const { error } = await supabase.from("activities").insert({
      lead_id: parsed.data.lead_id,
      type: parsed.data.type,
      description: parsed.data.description ?? null,
      user_id: user.id,
    });
    if (error) {
      console.error("[createActivity]", error);
      return { ok: false, error: "No se pudo registrar la actividad. Inténtalo de nuevo." };
    }
    revalidatePath(`/leads/${parsed.data.lead_id}`);
    return { ok: true };
  } catch (e) {
    console.error("[createActivity]", e);
    return { ok: false, error: "No se pudo registrar la actividad. Inténtalo de nuevo." };
  }
}

export async function deleteActivity(id: string, leadId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) {
      console.error("[deleteActivity]", error);
      return { ok: false, error: "No se pudo eliminar la actividad." };
    }
    revalidatePath(`/leads/${leadId}`);
    return { ok: true };
  } catch (e) {
    console.error("[deleteActivity]", e);
    return { ok: false, error: "No se pudo eliminar la actividad." };
  }
}
