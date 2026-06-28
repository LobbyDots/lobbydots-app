"use client";

import { normalizeToE164 } from "@lobbydots/shared";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Body, PrimaryButton, Screen, TextField, Title } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { spacing } from "@/theme/tokens";

// Pantalla 2 — verificación de teléfono por OTP. El teléfono ES el identificador.
function OtpInner() {
  const token = useSearchParams().get("token");
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const e164 = normalizeToE164(phone);

  async function sendCode() {
    if (!e164) {
      setError("Ese número no parece válido.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ phone: e164 });
    setBusy(false);
    if (err) setError(err.message);
    else setSent(true);
  }

  async function verify() {
    if (!e164) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({
      phone: e164,
      token: code,
      type: "sms",
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (token) router.replace(`/onboarding?token=${encodeURIComponent(token)}`);
    else router.replace("/home");
  }

  return (
    <Screen>
      {!sent ? (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing(6) }}>
          <Title>Tu teléfono</Title>
          <TextField
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+34 600 000 000"
            inputMode="tel"
            autoFocus
          />
          {error ? <Body dim>{error}</Body> : null}
          <PrimaryButton label="Enviar código" onClick={sendCode} disabled={busy || !e164} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing(6) }}>
          <Title>Introduce el código</Title>
          <TextField
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="••••••"
            inputMode="numeric"
            autoFocus
          />
          {error ? <Body dim>{error}</Body> : null}
          <PrimaryButton label="Verificar" onClick={verify} disabled={busy || code.length < 4} />
        </div>
      )}
    </Screen>
  );
}

export default function OtpPage() {
  return (
    <Suspense>
      <OtpInner />
    </Suspense>
  );
}
