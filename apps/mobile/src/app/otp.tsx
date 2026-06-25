import { normalizeToE164 } from "@lobbydots/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { supabase } from "@/auth/supabase";
import { Body, PrimaryButton, Screen, TextField, Title } from "@/components/ui";
import { spacing } from "@/theme/tokens";

// Pantalla 2 — verificación de teléfono por OTP. El teléfono ES el identificador.
export default function Otp() {
  const { token } = useLocalSearchParams<{ token?: string }>();
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
    if (token) {
      router.replace({ pathname: "/onboarding", params: { token } });
    } else {
      router.replace("/");
    }
  }

  return (
    <Screen>
      {!sent ? (
        <View style={{ gap: spacing(6) }}>
          <Title>Tu teléfono</Title>
          <TextField
            value={phone}
            onChangeText={setPhone}
            placeholder="+34 600 000 000"
            keyboardType="phone-pad"
            autoFocus
          />
          {error ? <Body dim>{error}</Body> : null}
          <PrimaryButton
            label="Enviar código"
            onPress={sendCode}
            disabled={busy || !e164}
          />
        </View>
      ) : (
        <View style={{ gap: spacing(6) }}>
          <Title>Introduce el código</Title>
          <TextField
            value={code}
            onChangeText={setCode}
            placeholder="••••••"
            keyboardType="number-pad"
            autoFocus
          />
          {error ? <Body dim>{error}</Body> : null}
          <PrimaryButton
            label="Verificar"
            onPress={verify}
            disabled={busy || code.length < 4}
          />
        </View>
      )}
    </Screen>
  );
}
