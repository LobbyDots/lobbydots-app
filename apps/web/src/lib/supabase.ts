import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// Supabase SOLO para auth (OTP de teléfono). El resto va por la API NestJS.
// En navegador usa localStorage por defecto (igual que la rama web del móvil).
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // OTP de teléfono: sin magic-link/redirect que parsear.
  },
});
