import { useQueryClient } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { supabase } from "@/auth/supabase";
import { Body, PrimaryButton, Screen, Title } from "@/components/ui";
import { spacing } from "@/theme/tokens";

// Login de DESARROLLO — entra por email+password (sin SMS/OTP). Solo __DEV__.
// No toca el flujo real de OTP. Requiere haber corrido el seed:
//   pnpm --filter @lobbydots/api seed:dev
const DEV_PASSWORD = "Lobbydots-Dev-123!";
const ACCOUNTS = [
  { label: "Entrar como Ada", email: "ada.dev@example.com" },
  { label: "Entrar como Bruno", email: "bruno.dev@example.com" },
];

export default function DevLogin() {
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!__DEV__) return <Redirect href="/" />;

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
    router.replace("/");
  }

  return (
    <Screen style={{ gap: spacing(6) }}>
      <Title>Login de dev</Title>
      <Body dim>
        Solo desarrollo, sin SMS. Corre antes el seed:
        pnpm --filter @lobbydots/api seed:dev
      </Body>
      {ACCOUNTS.map((a) => (
        <PrimaryButton
          key={a.email}
          label={a.label}
          onPress={() => login(a.email)}
          disabled={busy}
        />
      ))}
      {error ? <Body dim>{error}</Body> : null}
    </Screen>
  );
}
