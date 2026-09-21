import { createClient } from "@supabase/supabase-js";

/**
 * Cliente admin: SOLO servidor, solo cuando sea estrictamente necesario.
 * En V1 no se usa en ningún flujo (RLS cubre todo). Se deja preparado.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Faltan variables de entorno de Supabase (admin).");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
