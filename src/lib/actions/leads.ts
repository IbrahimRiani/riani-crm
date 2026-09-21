"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { leadSchema } from "@/lib/validations/lead";
import { LEAD_STATUS_LABELS } from "@/lib/constants/crm";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const USER_ERROR = "No se pudo guardar el lead. Inténtalo de nuevo.";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  return { supabase, user };
}

function toDb(v: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) {
    out[k] = val === undefined ? null : val;
  }
  return out;
}

export async function createLead(input: unknown): Promise<ActionResult> {
  try {
    const parsed = leadSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Revisa los campos del formulario." };
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
      .from("leads")
      .insert({ ...toDb(parsed.data as Record<string, unknown>), user_id: user.id })
      .select("id")
      .single();
    if (error) {
      console.error("[createLead]", error);
      return { ok: false, error: USER_ERROR };
    }
    revalidatePath("/leads");
    revalidatePath("/dashboard");
    revalidatePath("/pipeline");
    return { ok: true, id: data.id };
  } catch (e) {
    console.error("[createLead]", e);
    return { ok: false, error: USER_ERROR };
  }
}

export async function updateLead(id: string, input: unknown): Promise<ActionResult> {
  try {
    const parsed = leadSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Revisa los campos del formulario." };
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("leads")
      .update(toDb(parsed.data as Record<string, unknown>))
      .eq("id", id);
    if (error) {
      console.error("[updateLead]", error);
      return { ok: false, error: USER_ERROR };
    }
    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
    revalidatePath("/dashboard");
    revalidatePath("/pipeline");
    return { ok: true, id };
  } catch (e) {
    console.error("[updateLead]", e);
    return { ok: false, error: USER_ERROR };
  }
}

export async function deleteLead(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) {
      console.error("[deleteLead]", error);
      return { ok: false, error: "No se pudo eliminar el lead. Inténtalo de nuevo." };
    }
    revalidatePath("/leads");
    revalidatePath("/dashboard");
    revalidatePath("/pipeline");
    return { ok: true };
  } catch (e) {
    console.error("[deleteLead]", e);
    return { ok: false, error: "No se pudo eliminar el lead. Inténtalo de nuevo." };
  }
}

export async function moveLeadStatus(
  id: string,
  from: string,
  to: string,
): Promise<ActionResult> {
  try {
    const allowed = Object.keys(LEAD_STATUS_LABELS);
    if (!allowed.includes(to)) return { ok: false, error: "Estado no válido." };
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("leads").update({ status: to }).eq("id", id);
    if (error) {
      console.error("[moveLeadStatus]", error);
      return { ok: false, error: "No se pudo mover el lead. Inténtalo de nuevo." };
    }
    const fromLabel = LEAD_STATUS_LABELS[from as keyof typeof LEAD_STATUS_LABELS] ?? from;
    const toLabel = LEAD_STATUS_LABELS[to as keyof typeof LEAD_STATUS_LABELS] ?? to;
    await supabase.from("activities").insert({
      user_id: user.id,
      lead_id: id,
      type: "status_change",
      description: `Lead movido de ${fromLabel} → ${toLabel}`,
    });
    revalidatePath("/pipeline");
    revalidatePath("/dashboard");
    revalidatePath(`/leads/${id}`);
    return { ok: true };
  } catch (e) {
    console.error("[moveLeadStatus]", e);
    return { ok: false, error: "No se pudo mover el lead. Inténtalo de nuevo." };
  }
}
