"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Body,
  Display,
  LinkButton,
  PrimaryButton,
  Screen,
  Spinner,
  TextField,
} from "@/components/ui";
import { useMe } from "@/lib/api/hooks";
import { useSession } from "@/lib/use-session";
import { colors, spacing } from "@/theme/tokens";

// Puerta de entrada. Con sesión + Member → /home. Si no, la marca: terso y seco.
export default function Landing() {
  const router = useRouter();
  const { session, loading } = useSession();
  const me = useMe(!loading && !!session);
  const [invite, setInvite] = useState("");

  useEffect(() => {
    if (!loading && session && me.data) router.replace("/home");
  }, [loading, session, me.data, router]);

  if (loading || (!!session && me.isLoading)) return <Spinner />;

  function openInvite() {
    const raw = invite.trim();
    // Acepta la URL completa (…/i/<token>) o el token pelado.
    const token = raw.includes("/i/")
      ? (raw.split("/i/")[1]?.split(/[/?#]/)[0] ?? "")
      : raw;
    if (token) router.push(`/i/${token}`);
  }

  return (
    <Screen justify="flex-end" style={{ paddingBottom: spacing(16), gap: spacing(4) }}>
      <Display>Lobbydots</Display>
      <Body>Por invitación.</Body>

      <div style={{ marginTop: spacing(10), display: "flex", flexDirection: "column", gap: spacing(4) }}>
        <TextField
          value={invite}
          onChange={(e) => setInvite(e.target.value)}
          placeholder="Pega tu invitación"
          aria-label="Invitación"
        />
        <PrimaryButton label="Abrir invitación" onClick={openInvite} disabled={invite.trim().length === 0} />
      </div>

      <div style={{ marginTop: spacing(2) }}>
        <LinkButton
          label="Ya tengo cuenta · Entrar"
          onClick={() => router.push("/otp")}
          color={colors.charcoal}
        />
      </div>

      {process.env.NODE_ENV !== "production" ? (
        <LinkButton label="· dev login" onClick={() => router.push("/dev-login")} />
      ) : null}
    </Screen>
  );
}
