// Variables públicas (NEXT_PUBLIC_*). Next las inlinea en el bundle del navegador.
// Distintas de las EXPO_PUBLIC_* del móvil. Nunca exponer service_role ni HASH_PEPPER.
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
};
