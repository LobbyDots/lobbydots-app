"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { supabase } from "@/lib/supabase";
import {
  Body,
  Label,
  LinkButton,
  PrimaryButton,
  Screen,
  TextArea,
  Title,
} from "@/components/ui";
import type { IntroDetail as IntroDetailType } from "@/lib/api/hooks";
import {
  useCreateInvite,
  useCreateRequest,
  useIntros,
  useOpenRequests,
  useRequests,
  useVolunteer,
} from "@/lib/api/hooks";
import { colors, radius, spacing, type } from "@/theme/tokens";

// Texto de estado para una intro "en marcha" (no requiere decisión tuya ahora).
// Devuelve null si no hay hilo activo que mostrar (p.ej. rechazada).
function activeLine(d: IntroDetailType): { text: string; cta: boolean } | null {
  const s = d.intro.status;
  if (s === "proposed" && d.role === "broker") {
    return {
      text: `Te ofreciste a ayudar a ${d.context?.counterpartName ?? "alguien"} · esperando su decisión`,
      cta: false,
    };
  }
  if (s === "approved") {
    return {
      text: `Conexión lista con ${d.reveal?.counterpartName ?? "tu contraparte"} · abre el canal`,
      cta: true,
    };
  }
  if (s === "completed") {
    return { text: `Hecha · ${d.reveal?.counterpartName ?? ""}`.trim(), cta: false };
  }
  return null;
}

// Pantalla 4 — Home (flujo por descripción). Tres hilos visibles para no perder
// el rastro en web (sin push): lo que decides, lo que tienes en marcha (incluye
// tus ofrecimientos), y lo que puedes ayudar a resolver.
function HomeInner() {
  const router = useRouter();
  const qc = useQueryClient();
  const requests = useRequests();
  const intros = useIntros();
  const openRequests = useOpenRequests();
  const createRequest = useCreateRequest();
  const createInvite = useCreateInvite();
  const volunteer = useVolunteer();

  const [desc, setDesc] = useState("");
  const [posted, setPosted] = useState(false);
  const [offered, setOffered] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const all = intros.data ?? [];
  const toDecide = all.filter((d) => d.canDecide); // te toca decidir ahora
  const active = all // ofrecimientos en curso + conexiones listas (ambas partes)
    .filter((d) => !d.canDecide)
    .map((d) => ({ d, line: activeLine(d) }))
    .filter(
      (x): x is { d: IntroDetailType; line: { text: string; cta: boolean } } =>
        x.line !== null,
    );
  const openToHelp = openRequests.data ?? [];
  const canSubmit = desc.trim().length >= 3;

  async function submit() {
    if (!canSubmit) return;
    await createRequest.mutateAsync({ targetDesc: desc.trim() });
    setDesc("");
    setPosted(true);
  }

  async function offer(requestId: string, who: string) {
    await volunteer.mutateAsync(requestId);
    setOffered(who); // confirmación inmediata; el hilo aparece en "EN MARCHA"
  }

  async function logout() {
    await supabase.auth.signOut();
    qc.clear(); // descarta la caché del usuario que sale
    router.replace("/");
  }

  async function invite() {
    const res = await createInvite.mutateAsync();
    setInviteUrl(res.inviteUrl);
    try {
      await navigator.clipboard.writeText(res.inviteUrl);
    } catch {
      // sin permiso de portapapeles: la URL queda visible para copiar a mano
    }
  }

  return (
    <Screen justify="flex-start" style={{ paddingTop: spacing(12), gap: spacing(2) }}>
      {/* 1) Lo que TÚ decides ahora */}
      {toDecide.length > 0 ? (
        <div style={{ marginBottom: spacing(6) }}>
          <Label>TIENES ALGO QUE DECIDIR</Label>
          {toDecide.map((d) => (
            <button
              key={d.intro.id}
              type="button"
              onClick={() => router.push(`/intro/${d.intro.id}`)}
              style={{
                width: "100%",
                textAlign: "left",
                backgroundColor: colors.ink,
                color: colors.cream,
                border: "none",
                borderRadius: radius.md,
                padding: spacing(4),
                marginTop: spacing(2),
                fontSize: type.body,
              }}
            >
              {d.context?.counterpartName
                ? `${d.context.counterpartName} se ofrece a ayudarte`
                : "Alguien se ofrece a ayudarte"}
            </button>
          ))}
        </div>
      ) : null}

      {/* 2) En marcha: tus ofrecimientos esperando respuesta + conexiones listas */}
      {active.length > 0 ? (
        <div style={{ marginBottom: spacing(6) }}>
          <Label>EN MARCHA</Label>
          {active.map(({ d, line }) => (
            <button
              key={d.intro.id}
              type="button"
              onClick={() => router.push(`/intro/${d.intro.id}`)}
              style={{
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderBottom: `1px solid ${colors.hairline}`,
                padding: `${spacing(3)}px 0`,
                fontSize: type.body,
                color: line.cta ? colors.oxblood : colors.charcoal,
              }}
            >
              {line.text}
            </button>
          ))}
        </div>
      ) : null}

      {/* 3) Preguntar a la red */}
      <Title>¿A quién buscas?</Title>
      <div style={{ marginTop: spacing(4), display: "flex", flexDirection: "column", gap: spacing(4) }}>
        <TextArea
          value={desc}
          onChange={(e) => {
            setDesc(e.target.value);
            setPosted(false);
          }}
          placeholder="Inversor Serie A, fintech, ES"
          maxLength={280}
        />
        <PrimaryButton label="Preguntar" onClick={submit} disabled={!canSubmit || createRequest.isPending} />
        {posted ? (
          <Body dim>Tu pregunta está en la red. Te avisaremos cuando alguien se ofrezca.</Body>
        ) : null}
      </div>

      {/* 4) Lo que puedes ayudar a resolver (pull) */}
      {openToHelp.length > 0 ? (
        <div style={{ marginTop: spacing(8) }}>
          <Label>PUEDES AYUDAR</Label>
          {openToHelp.map((r) => (
            <div
              key={r.id}
              style={{
                paddingTop: spacing(3),
                paddingBottom: spacing(3),
                borderBottom: `1px solid ${colors.hairline}`,
                display: "flex",
                flexDirection: "column",
                gap: spacing(1),
              }}
            >
              <Body>
                {r.requesterName} busca: {r.targetDesc}
              </Body>
              <button
                type="button"
                onClick={() => offer(r.id, r.requesterName)}
                disabled={volunteer.isPending}
                style={{
                  background: "none",
                  border: "none",
                  color: colors.oxblood,
                  fontSize: type.body,
                  padding: 0,
                  textAlign: "left",
                  width: "fit-content",
                }}
              >
                Conozco a alguien
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {offered ? (
        <Body dim style={{ marginTop: spacing(3) }}>
          Te ofreciste a ayudar a {offered}. Lo verás arriba, en “EN MARCHA”, hasta que decida.
        </Body>
      ) : null}

      {/* 5) Tus peticiones */}
      <div style={{ marginTop: spacing(8) }}>
        <Label>TUS PETICIONES</Label>
        <div style={{ marginTop: spacing(2) }}>
          {(requests.data ?? []).length === 0 ? (
            <Body dim>Aún no has preguntado nada.</Body>
          ) : (
            (requests.data ?? []).map((item) => (
              <div
                key={item.id}
                style={{
                  paddingTop: spacing(3),
                  paddingBottom: spacing(3),
                  borderBottom: `1px solid ${colors.hairline}`,
                }}
              >
                <Body>{item.targetDesc ?? "Una descripción"}</Body>
                <span style={{ color: colors.muted, fontSize: type.caption }}>{statusLabel(item.status)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 6) Invitar */}
      <div style={{ marginTop: spacing(8) }}>
        <LinkButton
          label="Invitar a alguien"
          onClick={invite}
          disabled={createInvite.isPending}
          color={colors.charcoal}
        />
        {inviteUrl ? (
          <Body dim style={{ textAlign: "center", wordBreak: "break-all", marginTop: spacing(2) }}>
            Enlace copiado · {inviteUrl}
          </Body>
        ) : null}
      </div>

      {/* Salir */}
      <div style={{ marginTop: spacing(6), marginBottom: spacing(4) }}>
        <LinkButton label="Salir" onClick={logout} color={colors.muted} />
        {process.env.NEXT_PUBLIC_DEMO !== "0" ? (
          <LinkButton label="· cambiar de cuenta (dev)" onClick={() => router.push("/dev-login")} />
        ) : null}
      </div>
    </Screen>
  );
}

function statusLabel(s: string): string {
  switch (s) {
    case "open":
      return "en la red, esperando";
    case "matched":
      return "alguien se ofreció";
    case "completed":
      return "presentación hecha";
    case "closed":
      return "cerrada";
    default:
      return s;
  }
}

export default function HomePage() {
  return (
    <AuthGuard>
      <HomeInner />
    </AuthGuard>
  );
}
