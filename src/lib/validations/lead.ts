import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v));

export const leadSchema = z.object({
  company_name: z
    .string()
    .trim()
    .min(1, "El nombre de la empresa es obligatorio")
    .max(200),
  business_type: optionalText(120),
  contact_name: optionalText(120),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => !v || /^[+()\-.\s\d]{6,40}$/.test(v), {
      message: "Teléfono no válido",
    }),
  whatsapp: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => !v || /^[+()\-.\s\d]{6,40}$/.test(v), {
      message: "WhatsApp no válido",
    }),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "Email no válido",
    }),
  website: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => {
      if (!v) return undefined;
      return /^https?:\/\//i.test(v) ? v : `https://${v}`;
    })
    .refine((v) => !v || z.string().url().safeParse(v).success, {
      message: "Web no válida",
    }),
  city: optionalText(120),
  province: optionalText(120),
  status: z.enum([
    "new",
    "contacted",
    "whatsapp_sent",
    "meeting",
    "demo",
    "proposal",
    "won",
    "lost",
  ]),
  priority: z.enum(["low", "medium", "high"]),
  source: z.enum(["manual", "lead_hunter", "referral", "website", "other"]),
  deal_value: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "" || v === null) return undefined;
      const n = typeof v === "string" ? Number(v.replace(",", ".")) : v;
      return Number.isFinite(n) ? Math.round(n) : undefined;
    })
    .refine((v) => v === undefined || (v >= 0 && v <= 100_000_000), {
      message: "Valor no válido",
    }),
  next_follow_up: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  notes: optionalText(5000),
  assigned_to: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => !v || z.string().uuid().safeParse(v).success, {
      message: "Responsable no válido",
    }),
});

export type LeadFormValues = z.input<typeof leadSchema>;
export type LeadValidated = z.output<typeof leadSchema>;
