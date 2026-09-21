"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { leadSchema, type LeadFormValues } from "@/lib/validations/lead";
import {
  LEAD_STATUSES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
} from "@/lib/constants/crm";
import type { Lead } from "@/types/crm";
import { createLead, updateLead } from "@/lib/actions/leads";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select, FieldError } from "@/components/ui/form";

function defaults(lead?: Lead): LeadFormValues {
  return {
    company_name: lead?.company_name ?? "",
    business_type: lead?.business_type ?? "",
    contact_name: lead?.contact_name ?? "",
    phone: lead?.phone ?? "",
    whatsapp: lead?.whatsapp ?? "",
    email: lead?.email ?? "",
    website: lead?.website ?? "",
    city: lead?.city ?? "",
    province: lead?.province ?? "",
    status: lead?.status ?? "new",
    priority: lead?.priority ?? "medium",
    source: lead?.source ?? "manual",
    deal_value: lead?.deal_value ?? undefined,
    next_follow_up: lead?.next_follow_up ?? "",
    notes: lead?.notes ?? "",
  } as LeadFormValues;
}

export function LeadForm({ lead, onDone }: { lead?: Lead; onDone?: () => void }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: defaults(lead),
  });

  async function onSubmit(values: LeadFormValues) {
    setServerError(null);
    const res = lead ? await updateLead(lead.id, values) : await createLead(values);
    if (!res.ok) {
      setServerError(res.error);
      return;
    }
    if (onDone) onDone();
    router.push(lead ? `/leads/${lead.id}` : `/leads/${res.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="company_name">Nombre empresa *</Label>
        <Input id="company_name" {...register("company_name")} placeholder="Clínica Dental Sonrisa" />
        <FieldError message={errors.company_name?.message} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="business_type">Tipo de negocio</Label>
          <Input id="business_type" {...register("business_type")} placeholder="Clínica dental" />
        </div>
        <div>
          <Label htmlFor="contact_name">Nombre contacto</Label>
          <Input id="contact_name" {...register("contact_name")} placeholder="María García" />
        </div>
        <div>
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" {...register("phone")} placeholder="600 123 456" inputMode="tel" />
          <FieldError message={errors.phone?.message} />
        </div>
        <div>
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input id="whatsapp" {...register("whatsapp")} placeholder="600 123 456" inputMode="tel" />
          <FieldError message={errors.whatsapp?.message} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} placeholder="info@empresa.com" />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="website">Web</Label>
          <Input id="website" {...register("website")} placeholder="empresa.com" inputMode="url" />
          <FieldError message={errors.website?.message} />
        </div>
        <div>
          <Label htmlFor="city">Ciudad</Label>
          <Input id="city" {...register("city")} placeholder="Madrid" />
        </div>
        <div>
          <Label htmlFor="province">Provincia</Label>
          <Input id="province" {...register("province")} placeholder="Madrid" />
        </div>
        <div>
          <Label htmlFor="status">Estado</Label>
          <Select id="status" {...register("status")}>
            {LEAD_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Prioridad</Label>
          <Select id="priority" {...register("priority")}>
            {LEAD_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="source">Fuente</Label>
          <Select id="source" {...register("source")}>
            {LEAD_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="deal_value">Valor potencial (€)</Label>
          <Input id="deal_value" type="number" min={0} step={1} {...register("deal_value")} placeholder="1500" />
          <FieldError message={errors.deal_value?.message} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="next_follow_up">Próximo seguimiento</Label>
          <Input id="next_follow_up" type="date" {...register("next_follow_up")} />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" {...register("notes")} placeholder="Contexto, necesidades, presupuesto…" />
      </div>

      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : lead ? "Guardar cambios" : "Crear lead"}
        </Button>
      </div>
    </form>
  );
}
