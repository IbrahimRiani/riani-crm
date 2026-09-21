const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatEUR(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return eur.format(value);
}

export function formatDateES(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
}

export function formatDateTimeES(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Devuelve "Hoy" | "Mañana" | "Ayer" o fecha dd/mm/aaaa */
export function relativeDayES(iso: string | null | undefined): string {
  if (!iso) return "Sin fecha";
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayStr = fmt.format(new Date());
  const target = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  const targetStr = fmt.format(target);
  if (targetStr === todayStr) return "Hoy";
  const dayMs = 24 * 60 * 60 * 1000;
  const toUTC = (s: string) => Date.parse(`${s}T00:00:00Z`);
  const diff = Math.round((toUTC(targetStr) - toUTC(todayStr)) / dayMs);
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  return target.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
}

export function todayMadridISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
