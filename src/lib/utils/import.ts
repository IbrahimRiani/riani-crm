import { leadSchema } from "@/lib/validations/lead";

/**
 * Importación de leads desde CSV/TXT.
 * Formato oficial (separador `;`, UTF-8, primera línea de cabeceras):
 *
 *   Empresa;Tipo;Contacto;Teléfono;WhatsApp;Email;Web;Ciudad;Provincia;Estado;Prioridad;Fuente;Valor;Próximo seguimiento;Notas;Fecha creación
 *
 * - Solo `Empresa` es obligatoria. `Fecha creación` se ignora al importar.
 * - Estado/Prioridad/Fuente aceptan etiqueta en español ("Propuesta", "Alta"...)
 *   o valor interno ("proposal", "high"...). Vacíos → new / medium / manual.
 * - Valor: número en formato español ("1.200 €", "1500"). Fecha: dd/mm/aaaa o aaaa-mm-dd.
 * - También se acepta separador `,` si la cabecera lo usa. Campos con `;` deben ir entre comillas.
 */

export const IMPORT_HEADERS = [
  "Empresa",
  "Tipo",
  "Contacto",
  "Teléfono",
  "WhatsApp",
  "Email",
  "Web",
  "Ciudad",
  "Provincia",
  "Estado",
  "Prioridad",
  "Fuente",
  "Responsable",
  "Valor",
  "Próximo seguimiento",
  "Notas",
  "Fecha creación",
] as const;

export const MAX_IMPORT_ROWS = 500;

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ParsedImportRow {
  row: number;
  data: Record<string, unknown>;
  /** Email de la columna Responsable (se resuelve a assigned_to en el servidor). */
  assigneeEmail?: string;
}

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const COLUMN_MAP: Record<string, string> = {
  empresa: "company_name",
  "nombre empresa": "company_name",
  company: "company_name",
  tipo: "business_type",
  "tipo de negocio": "business_type",
  contacto: "contact_name",
  "nombre contacto": "contact_name",
  telefono: "phone",
  phone: "phone",
  whatsapp: "whatsapp",
  email: "email",
  correo: "email",
  web: "website",
  website: "website",
  "sitio web": "website",
  ciudad: "city",
  city: "city",
  provincia: "province",
  province: "province",
  estado: "status",
  status: "status",
  fase: "status",
  prioridad: "priority",
  priority: "priority",
  fuente: "source",
  source: "source",
  origen: "source",
  valor: "deal_value",
  "valor potencial": "deal_value",
  precio: "deal_value",
  "proximo seguimiento": "next_follow_up",
  seguimiento: "next_follow_up",
  followup: "next_follow_up",
  "follow up": "next_follow_up",
  notas: "notes",
  notes: "notes",
  observaciones: "notes",
};

const STATUS_MAP: Record<string, string> = {
  nuevo: "new",
  new: "new",
  contactado: "contacted",
  contacted: "contacted",
  "whatsapp enviado": "whatsapp_sent",
  whatsapp: "whatsapp_sent",
  whatsapp_sent: "whatsapp_sent",
  reunion: "meeting",
  meeting: "meeting",
  demo: "demo",
  propuesta: "proposal",
  proposal: "proposal",
  ganado: "won",
  ganada: "won",
  won: "won",
  perdido: "lost",
  perdida: "lost",
  lost: "lost",
};

const PRIORITY_MAP: Record<string, string> = {
  baja: "low",
  low: "low",
  media: "medium",
  medium: "medium",
  alta: "high",
  alto: "high",
  high: "high",
};

const SOURCE_MAP: Record<string, string> = {
  manual: "manual",
  "lead hunter": "lead_hunter",
  lead_hunter: "lead_hunter",
  referido: "referral",
  referral: "referral",
  web: "website",
  website: "website",
  "sitio web": "website",
  otro: "other",
  other: "other",
};

/** Divide una línea CSV respetando campos entrecomillados ("..."). */
export function splitCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      fields.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

function detectDelimiter(headerLine: string): string {
  const semis = splitCSVLine(headerLine, ";").length;
  const commas = splitCSVLine(headerLine, ",").length;
  if (commas > semis) return ",";
  return ";";
}

/** "1.200 €" | "1500" | "2,500" → 1200 | 1500 | 2500. null si vacío, NaN si inválido. */
export function parseImportValue(raw: string): number | null | typeof NaN {
  const s = raw.trim().replace(/€/g, "").replace(/\s/g, "");
  if (!s) return null;
  let n: string;
  if (s.includes(",")) {
    // "2,500" (coma + 3 dígitos) = miles; "2,50" = decimal con coma
    n = /,\d{3}$/.test(s) ? s.replace(/[.,]/g, "") : s.replace(/\./g, "").replace(",", ".");
  } else if ((s.match(/\./g) ?? []).length > 1) {
    n = s.replace(/\./g, "");
  } else if (/^\d+\.\d{3}$/.test(s)) {
    n = s.replace(".", ""); // "1.200" = mil doscientos
  } else {
    n = s;
  }
  const v = Number(n);
  if (!Number.isFinite(v)) return NaN;
  return Math.round(v);
}

/** dd/mm/aaaa | dd-mm-aaaa | aaaa-mm-dd → "aaaa-mm-dd". null si vacío/inválido. */
export function parseImportDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let d: number, m: number, y: number;
  const es = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (es) {
    d = Number(es[1]);
    m = Number(es[2]);
    y = Number(es[3]);
  } else if (iso) {
    y = Number(iso[1]);
    m = Number(iso[2]);
    d = Number(iso[3]);
  } else {
    return null;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseLeadsCSV(text: string): {
  rows: ParsedImportRow[];
  errors: ImportRowError[];
  delimiter: string;
} {
  const errors: ImportRowError[] = [];
  const rows: ParsedImportRow[] = [];
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0) {
    return { rows, errors: [{ row: 0, message: "El archivo está vacío." }], delimiter: ";" };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCSVLine(lines[0], delimiter).map(norm);
  const colIndex = new Map<string, number>();
  let assigneeIdx: number | undefined;
  headers.forEach((h, i) => {
    if (["responsable", "owner", "asignado", "responsible"].includes(h)) {
      if (assigneeIdx === undefined) assigneeIdx = i;
      return;
    }
    const key = COLUMN_MAP[h];
    if (key && !colIndex.has(key)) colIndex.set(key, i);
  });

  if (!colIndex.has("company_name")) {
    return {
      rows,
      errors: [{ row: 1, message: "No se encontró la columna «Empresa» en la cabecera." }],
      delimiter,
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1; // 1 = cabecera
    const fields = splitCSVLine(lines[i], delimiter);
    const get = (key: string): string => {
      const idx = colIndex.get(key);
      return idx === undefined ? "" : (fields[idx] ?? "").trim();
    };

    const data: Record<string, unknown> = {
      company_name: get("company_name"),
      business_type: get("business_type") || undefined,
      contact_name: get("contact_name") || undefined,
      phone: get("phone") || undefined,
      whatsapp: get("whatsapp") || undefined,
      email: get("email") ? get("email").toLowerCase() : undefined,
      website: get("website") || undefined,
      city: get("city") || undefined,
      province: get("province") || undefined,
      notes: get("notes") || undefined,
    };

    const statusRaw = norm(get("status"));
    data.status = statusRaw ? (STATUS_MAP[statusRaw] ?? `__invalid:${get("status")}`) : "new";
    const priorityRaw = norm(get("priority"));
    data.priority = priorityRaw ? (PRIORITY_MAP[priorityRaw] ?? `__invalid:${get("priority")}`) : "medium";
    const sourceRaw = norm(get("source"));
    data.source = sourceRaw ? (SOURCE_MAP[sourceRaw] ?? `__invalid:${get("source")}`) : "manual";

    const valueRaw = get("deal_value");
    if (valueRaw) {
      const v = parseImportValue(valueRaw);
      if (typeof v === "number") data.deal_value = v;
      else {
        errors.push({ row: rowNumber, message: `Valor no válido: «${valueRaw}».` });
        continue;
      }
    }

    const dateRaw = get("next_follow_up");
    if (dateRaw) {
      const d = parseImportDate(dateRaw);
      if (d) data.next_follow_up = d;
      else {
        errors.push({ row: rowNumber, message: `Fecha no válida: «${dateRaw}» (usa dd/mm/aaaa).` });
        continue;
      }
    }

    const parsed = leadSchema.safeParse(data);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const field = first.path.join(".") || "fila";
      errors.push({ row: rowNumber, message: `${field}: ${first.message}` });
      continue;
    }
    const assigneeEmail =
      assigneeIdx !== undefined ? (fields[assigneeIdx] ?? "").trim().toLowerCase() : "";
    rows.push({
      row: rowNumber,
      data: parsed.data as Record<string, unknown>,
      assigneeEmail: assigneeEmail || undefined,
    });
  }

  return { rows, errors, delimiter };
}

/** Plantilla CSV lista para rellenar (misma cabecera que la exportación). */
export function buildLeadsTemplate(): string {
  const example = [
    "Clínica Dental Sonrisa",
    "Clínica dental",
    "María García",
    "600123456",
    "600123456",
    "info@sonrisa.com",
    "sonrisa.com",
    "Madrid",
    "Madrid",
    "Nuevo",
    "Alta",
    "Manual",
    "",
    "1500",
    "25/09/2026",
    "Quieren automatizar las citas por WhatsApp",
    "",
  ];
  return "\uFEFF" + IMPORT_HEADERS.join(";") + "\n" + example.join(";") + "\n";
}

/* ---------- Detección de duplicados por teléfono ---------- */

/** Solo dígitos, sin prefijos internacionales triviales ("00", "34" inicial). */
export function phoneDigits(raw: string | null | undefined): string {
  if (!raw) return "";
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  return d;
}

/**
 * Variantes del mismo número para comparar ("600123456" ≡ "34600123456").
 * Devuelve [] si no hay número utilizable.
 */
export function phoneKeyVariants(raw: string | null | undefined): string[] {
  const d = phoneDigits(raw);
  if (d.length < 9) return [];
  const out = new Set<string>([d]);
  if (d.length === 11 && d.startsWith("34")) out.add(d.slice(2));
  if (d.length === 9 && /^[67]/.test(d)) out.add(`34${d}`);
  return [...out];
}

/** Clave canónica de un número (para agrupar variantes del mismo teléfono). */
export function canonicalPhone(raw: string | null | undefined): string | null {
  const variants = phoneKeyVariants(raw);
  if (variants.length === 0) return null;
  return variants.find((v) => v.length === 9) ?? variants[0];
}

export interface DuplicateGroup {
  phone: string;
  leads: { id: string; company_name: string; created_at: string }[];
}

/**
 * Agrupa leads que comparten teléfono (mirando phone y whatsapp).
 * Pura y testeada; el orden de cada grupo es del más antiguo al más nuevo.
 */
export function findDuplicateGroups<
  T extends { id: string; company_name: string; phone: string | null; whatsapp: string | null; created_at: string },
>(leads: T[]): DuplicateGroup[] {
  const byPhone = new Map<string, T[]>();
  for (const l of leads) {
    const key = canonicalPhone(l.phone) ?? canonicalPhone(l.whatsapp);
    if (!key) continue;
    const list = byPhone.get(key) ?? [];
    list.push(l);
    byPhone.set(key, list);
  }
  return [...byPhone.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([phone, list]) => ({
      phone,
      leads: [...list]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((l) => ({ id: l.id, company_name: l.company_name, created_at: l.created_at })),
    }))
    .sort((a, b) => b.leads.length - a.leads.length);
}
