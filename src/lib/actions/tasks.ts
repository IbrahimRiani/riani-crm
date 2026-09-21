"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { taskSchema } from "@/lib/validations/task";
import type { ActionResult } from "@/lib/actions/leads";

function revalidateTasks(leadId?: string | null) {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (leadId) revalidatePath(`/leads/${leadId}`);
}

export async function createTask(input: unknown): Promise<ActionResult> {
  try {
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Revisa los campos de la tarea." };
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        due_date: parsed.data.due_date ?? null,
        lead_id: parsed.data.lead_id ?? null,
        completed: parsed.data.completed ?? false,
        user_id: user.id,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[createTask]", error);
      return { ok: false, error: "No se pudo crear la tarea. Inténtalo de nuevo." };
    }
    revalidateTasks(parsed.data.lead_id);
    return { ok: true, id: data.id };
  } catch (e) {
    console.error("[createTask]", e);
    return { ok: false, error: "No se pudo crear la tarea. Inténtalo de nuevo." };
  }
}

export async function updateTask(id: string, input: unknown): Promise<ActionResult> {
  try {
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Revisa los campos de la tarea." };
    const supabase = await createClient();
    const { error } = await supabase
      .from("tasks")
      .update({
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        due_date: parsed.data.due_date ?? null,
        lead_id: parsed.data.lead_id ?? null,
        completed: parsed.data.completed ?? false,
      })
      .eq("id", id);
    if (error) {
      console.error("[updateTask]", error);
      return { ok: false, error: "No se pudo guardar la tarea. Inténtalo de nuevo." };
    }
    revalidateTasks(parsed.data.lead_id);
    return { ok: true, id };
  } catch (e) {
    console.error("[updateTask]", e);
    return { ok: false, error: "No se pudo guardar la tarea. Inténtalo de nuevo." };
  }
}

export async function toggleTask(id: string, completed: boolean): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tasks")
      .update({ completed })
      .eq("id", id)
      .select("lead_id")
      .single();
    if (error) {
      console.error("[toggleTask]", error);
      return { ok: false, error: "No se pudo actualizar la tarea." };
    }
    revalidateTasks(data?.lead_id);
    return { ok: true };
  } catch (e) {
    console.error("[toggleTask]", e);
    return { ok: false, error: "No se pudo actualizar la tarea." };
  }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("tasks").select("lead_id").eq("id", id).single();
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      console.error("[deleteTask]", error);
      return { ok: false, error: "No se pudo eliminar la tarea." };
    }
    revalidateTasks(data?.lead_id);
    return { ok: true };
  } catch (e) {
    console.error("[deleteTask]", e);
    return { ok: false, error: "No se pudo eliminar la tarea." };
  }
}
