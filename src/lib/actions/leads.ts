"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUserRole } from "@/lib/supabase/server";
import { leadSchema } from "@/lib/validations/lead";
import { LEAD_STATUS_LABELS } from "@/lib/constants/crm";
import { parseLeadsCSV, MAX_IMPORT_ROWS, phoneKeyVariants, findDuplicateGroups, type DuplicateGroup } from "@/lib/utils/import";

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
    if ((await getUserRole()) !== "admin") {
      return { ok: false, error: "Solo un administrador puede eliminar leads." };
    }
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

export interface ImportSummary {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export async function importLeadsFromCSV(
  text: unknown,
): Promise<{ ok: true; summary: ImportSummary } | { ok: false; error: string }> {
  try {
    if (typeof text !== "string" || text.trim() === "") {
      return { ok: false, error: "El archivo está vacío." };
    }
    if (text.length > 500_000) {
      return { ok: false, error: "El archivo es demasiado grande (máx. ~500 filas por importación)." };
    }
    const { rows, errors } = parseLeadsCSV(text);
    if (rows.length === 0 && errors.length > 0 && errors[0].row <= 1) {
      return { ok: false, error: errors[0].message };
    }
    if (rows.length + errors.length > MAX_IMPORT_ROWS) {
      return {
        ok: false,
        error: `Demasiadas filas (máx. ${MAX_IMPORT_ROWS} por importación). Divide el archivo.`,
      };
    }

    const { supabase, user } = await requireUser();
    const { data: existing } = await supabase
      .from("leads")
      .select("company_name, phone, whatsapp, email");

    // Resolver columna Responsable (email) → assigned_to
    const { data: profiles } = await supabase.from("profiles").select("id, email");
    const profileByEmail = new Map(
      (profiles ?? []).map((p) => [(p.email ?? "").toLowerCase().trim(), p.id as string]),
    );
    const rowErrors = [...errors];

    // Teléfonos ya existentes (cualquier variante: con/sin 34, phone o whatsapp)
    const usedPhones = new Set<string>();
    for (const l of existing ?? []) {
      for (const v of [...phoneKeyVariants(l.phone), ...phoneKeyVariants(l.whatsapp)]) {
        usedPhones.add(v);
      }
    }
    const usedCompanyEmail = new Set(
      (existing ?? []).map((l) =>
        `${(l.company_name ?? "").toLowerCase().trim()}|${(l.email ?? "").toLowerCase().trim()}`,
      ),
    );

    const toInsert: Record<string, unknown>[] = [];
    let skipped = 0;
    for (const r of rows) {
      const d = r.data as Record<string, string | number | null>;
      if (r.assigneeEmail) {
        const pid = profileByEmail.get(r.assigneeEmail);
        if (!pid) {
          rowErrors.push({ row: r.row, message: `Responsable desconocido: «${r.assigneeEmail}».` });
          continue;
        }
        d.assigned_to = pid;
      }
      const rowPhones = [
        ...phoneKeyVariants(String(d.phone ?? "")),
        ...phoneKeyVariants(String(d.whatsapp ?? "")),
      ];
      const phoneDup = rowPhones.some((v) => usedPhones.has(v));
      const companyEmail = `${String(d.company_name ?? "").toLowerCase().trim()}|${String(d.email ?? "").toLowerCase().trim()}`;
      const companyDup = d.email ? usedCompanyEmail.has(companyEmail) : false;
      if (phoneDup || companyDup) {
        skipped++;
        continue;
      }
      for (const v of rowPhones) usedPhones.add(v);
      if (d.email) usedCompanyEmail.add(companyEmail);
      toInsert.push({ ...toDb(r.data), user_id: user.id });
    }

    if (toInsert.length > 0) {
      const { error } = await supabase.from("leads").insert(toInsert);
      if (error) {
        console.error("[importLeadsFromCSV]", error);
        return { ok: false, error: "No se pudo importar. Inténtalo de nuevo." };
      }
    }

    revalidatePath("/leads");
    revalidatePath("/dashboard");
    revalidatePath("/pipeline");
    return { ok: true, summary: { imported: toInsert.length, skipped, errors: rowErrors } };
  } catch (e) {
    console.error("[importLeadsFromCSV]", e);
    return { ok: false, error: "No se pudo importar. Inténtalo de nuevo." };
  }
}

export async function getDuplicateGroups(): Promise<
  { ok: true; groups: DuplicateGroup[] } | { ok: false; error: string }
> {
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("leads")
      .select("id, company_name, phone, whatsapp, created_at")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[getDuplicateGroups]", error);
      return { ok: false, error: "No se pudieron buscar duplicados. Inténtalo de nuevo." };
    }
    return { ok: true, groups: findDuplicateGroups(data ?? []).slice(0, 100) };
  } catch (e) {
    console.error("[getDuplicateGroups]", e);
    return { ok: false, error: "No se pudieron buscar duplicados. Inténtalo de nuevo." };
  }
}

export async function deleteDuplicatePhones(): Promise<
  { ok: true; removed: number } | { ok: false; error: string }
> {
  try {
    const { supabase } = await requireUser();
    if ((await getUserRole()) !== "admin") {
      return { ok: false, error: "Solo un administrador puede eliminar duplicados." };
    }
    const { data, error } = await supabase
      .from("leads")
      .select("id, company_name, phone, whatsapp, created_at")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[deleteDuplicatePhones]", error);
      return { ok: false, error: "No se pudieron eliminar duplicados. Inténtalo de nuevo." };
    }
    // De cada grupo se conserva el más antiguo (primero) y se eliminan los demás.
    // Las actividades y tareas asociadas se eliminan en cascada.
    const ids = findDuplicateGroups(data ?? []).flatMap((g) => g.leads.slice(1).map((l) => l.id));
    if (ids.length === 0) return { ok: true, removed: 0 };
    const { error: delError } = await supabase.from("leads").delete().in("id", ids);
    if (delError) {
      console.error("[deleteDuplicatePhones]", delError);
      return { ok: false, error: "No se pudieron eliminar duplicados. Inténtalo de nuevo." };
    }
    revalidatePath("/leads");
    revalidatePath("/dashboard");
    revalidatePath("/pipeline");
    return { ok: true, removed: ids.length };
  } catch (e) {
    console.error("[deleteDuplicatePhones]", e);
    return { ok: false, error: "No se pudieron eliminar duplicados. Inténtalo de nuevo." };
  }
}
