"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Body, PrimaryButton, Screen, TextField, Title } from "@/components/ui";
import { useConsumeInvite } from "@/lib/api/hooks";
import { spacing } from "@/theme/tokens";

// Pantalla 3 — mini-perfil. Consume la invitación → crea Member + Vouch.
// (El import de agenda + tiers es nativo: se omite en el MVP web.)
function OnboardingInner() {
  const token = useSearchParams().get("token");
  const router = useRouter();
  const consume = useConsumeInvite();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  async function finish() {
    if (!token) return;
    try {
      await consume.mutateAsync({
        token,
        input: { displayName: name.trim(), bio: bio.trim() || undefined },
      });
      router.replace("/home");
    } catch {
      // el estado de error se muestra abajo
    }
  }

  return (
    <Screen>
      <div style={{ display: "flex", flexDirection: "column", gap: spacing(6) }}>
        <Title>Quién eres</Title>
        <TextField
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          autoFocus
        />
        <TextField
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Una línea sobre ti (opcional)"
        />
        {consume.isError ? <Body dim>No se pudo completar. Revisa la invitación.</Body> : null}
        <PrimaryButton
          label="Entrar"
          onClick={finish}
          disabled={consume.isPending || name.trim().length === 0 || !token}
        />
      </div>
    </Screen>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingInner />
    </Suspense>
  );
}
