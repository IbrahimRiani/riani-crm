/** Normaliza un teléfono ES/internacional a formato wa.me (solo dígitos). */
export function normalizeWhatsapp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // Si es un móvil español de 9 dígitos que empieza por 6/7, anteponer 34
  if (digits.length === 9 && /^[67]/.test(digits)) digits = `34${digits}`;
  if (digits.startsWith("00")) digits = digits.slice(2);
  return digits;
}

export function whatsappUrl(raw: string | null | undefined): string | null {
  const n = normalizeWhatsapp(raw);
  return n ? `https://wa.me/${n}` : null;
}
