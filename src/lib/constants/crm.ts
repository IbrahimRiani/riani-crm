export const LEAD_STATUSES = [
  { value: "new", label: "Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "whatsapp_sent", label: "WhatsApp enviado" },
  { value: "meeting", label: "Reunión" },
  { value: "demo", label: "Demo" },
  { value: "proposal", label: "Propuesta" },
  { value: "won", label: "Ganado" },
  { value: "lost", label: "Perdido" },
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number]["value"];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  whatsapp_sent: "WhatsApp enviado",
  meeting: "Reunión",
  demo: "Demo",
  proposal: "Propuesta",
  won: "Ganado",
  lost: "Perdido",
};

export const LEAD_PRIORITIES = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
] as const;

export type LeadPriority = (typeof LEAD_PRIORITIES)[number]["value"];

export const LEAD_PRIORITY_LABELS: Record<LeadPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export const LEAD_SOURCES = [
  { value: "manual", label: "Manual" },
  { value: "lead_hunter", label: "Lead Hunter" },
  { value: "referral", label: "Referido" },
  { value: "website", label: "Web" },
  { value: "other", label: "Otro" },
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number]["value"];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  manual: "Manual",
  lead_hunter: "Lead Hunter",
  referral: "Referido",
  website: "Web",
  other: "Otro",
};

export const ACTIVITY_TYPES = [
  { value: "note", label: "Nota" },
  { value: "call", label: "Llamada" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Reunión" },
  { value: "status_change", label: "Cambio de estado" },
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number]["value"];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  note: "Nota",
  call: "Llamada",
  whatsapp: "WhatsApp",
  email: "Email",
  meeting: "Reunión",
  status_change: "Cambio de estado",
};
