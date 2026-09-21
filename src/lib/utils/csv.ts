import type { Lead } from "@/types/crm";
import { LEAD_STATUS_LABELS, LEAD_PRIORITY_LABELS, LEAD_SOURCE_LABELS } from "@/lib/constants/crm";
import { formatDateES } from "@/lib/utils/format";

const HEADERS = [
  "Empresa", "Tipo", "Contacto", "Teléfono", "WhatsApp", "Email", "Web",
  "Ciudad", "Provincia", "Estado", "Prioridad", "Fuente", "Valor",
  "Próximo seguimiento", "Notas", "Fecha creación",
];

function cell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function leadsToCSV(leads: Lead[]): string {
  const rows = leads.map((l) =>
    [
      cell(l.company_name),
      cell(l.business_type),
      cell(l.contact_name),
      cell(l.phone),
      cell(l.whatsapp),
      cell(l.email),
      cell(l.website),
      cell(l.city),
      cell(l.province),
      cell(LEAD_STATUS_LABELS[l.status]),
      cell(LEAD_PRIORITY_LABELS[l.priority]),
      cell(LEAD_SOURCE_LABELS[l.source]),
      cell(l.deal_value ?? ""),
      cell(l.next_follow_up ? formatDateES(l.next_follow_up) : ""),
      cell(l.notes),
      cell(formatDateES(l.created_at)),
    ].join(";"),
  );
  return ["\uFEFF" + HEADERS.join(";"), ...rows].join("\n");
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
