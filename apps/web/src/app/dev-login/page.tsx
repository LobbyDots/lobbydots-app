"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Body, PrimaryButton, Screen, Title } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { spacing } from "@/theme/tokens";

// Login de DESARROLLO — entra por email+password (sin SMS/OTP). Espejo del móvil.
// No toca el flujo real de OTP. Requiere haber corrido el seed:
//   pnpm --filter @lobbydots/api seed:dev
const DEV_PASSWORD = "Lobbydots-Dev-123!";
const ACCOUNTS = [
  { label: "Entrar como Ada", email: "ada.dev@example.com" },
  { label: "Entrar como Bruno", email: "bruno.dev@example.com" },
  { label: "Entrar como Diego", email: "diego.dev@example.com" },
];

export default function DevLogin() {
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Visible en la demo por defecto; se oculta poniendo NEXT_PUBLIC_DEMO=0.
  if (process.env.NEXT_PUBLIC_DEMO === "0") {
    if (typeof window !== "undefined") router.replace("/");
    return null;
  }

  async function login(email: string) {
    setBusy(true);
    setError(null);
    // Cierra cualquier sesión previa para poder cambiar de cuenta limpiamente.
    await supabase.auth.signOut();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password: DEV_PASSWORD,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    qc.clear(); // descarta caché del usuario anterior
    router.replace("/home");
  }

  return (
    <Screen style={{ gap: spacing(6) }}>
      <Title>Login de dev</Title>
      <Body dim>
        Solo desarrollo, sin SMS. Corre antes el seed: pnpm --filter
        @lobbydots/api seed:dev
      </Body>
      {ACCOUNTS.map((a) => (
        <PrimaryButton
          key={a.email}
          label={a.label}
          onClick={() => login(a.email)}
          disabled={busy}
        />
      ))}
      {error ? <Body dim>{error}</Body> : null}
    </Screen>
  );
}
