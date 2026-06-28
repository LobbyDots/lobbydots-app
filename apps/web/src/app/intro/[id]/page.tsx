"use client";

import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Body, LinkButton, PrimaryButton, Screen, Spinner, Title } from "@/components/ui";
import {
  useApproveIntro,
  useCompleteIntro,
  useIntro,
  useRejectIntro,
} from "@/lib/api/hooks";
import { colors, spacing } from "@/theme/tokens";

// Pantalla 6 — Intro. Propuesta → decisión del gatekeeper → apertura del canal.
// En descripción decide el REQUESTER. Identidades y canal SOLO tras aprobar,
// y solo a las dos partes.
function IntroInner() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const router = useRouter();
  const intro = useIntro(id);
  const approve = useApproveIntro();
  const reject = useRejectIntro();
  const complete = useCompleteIntro();

  if (intro.isLoading) return <Spinner />;

  const d = intro.data;
  if (!d) {
    return (
      <Screen>
        <Title>No encontrada.</Title>
      </Screen>
    );
  }

  const status = d.intro.status;
  const reveal = d.reveal;

  // Revelado (aprobada/completada) — a ambas partes.
  if (reveal) {
    return (
      <Screen justify="space-between">
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: spacing(4) }}>
          <Title>
            {d.role === "requester"
              ? `${reveal.counterpartName} te presenta.`
              : `Presenta a ${reveal.counterpartName}.`}
          </Title>
          <Body dim>{reveal.draft}</Body>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing(3) }}>
          <PrimaryButton
            label="Abrir WhatsApp"
            onClick={() => window.open(reveal.channel.url, "_blank", "noopener,noreferrer")}
          />
          {status === "approved" ? (
            <LinkButton
              label="Marcar como hecha"
              onClick={() => complete.mutate(d.intro.id)}
              disabled={complete.isPending}
            />
          ) : (
            <Body dim style={{ textAlign: "center" }}>
              Completada.
            </Body>
          )}
        </div>
      </Screen>
    );
  }

  // Te toca decidir (gatekeeper). En descripción: alguien se ofrece.
  if (d.canDecide && d.context) {
    const isOffer = d.role === "requester";
    return (
      <Screen justify="space-between">
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: spacing(3) }}>
          <Title>
            {isOffer
              ? `${d.context.counterpartName} se ofrece a ayudarte.`
              : `${d.context.counterpartName} busca una presentación.`}
          </Title>
          {isOffer && d.context.targetDesc ? <Body>Buscabas: “{d.context.targetDesc}”.</Body> : null}
          <Body dim>
            {isOffer
              ? "Si aceptas, os conectáis para que haga la intro."
              : "Solo si te apetece. Nada se revela hasta que aceptes."}
          </Body>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing(3) }}>
          <PrimaryButton label="Aceptar" onClick={() => approve.mutate(d.intro.id)} disabled={approve.isPending} />
          <LinkButton
            label="Ahora no"
            onClick={() => {
              reject.mutate(d.intro.id);
              router.push("/home");
            }}
            disabled={reject.isPending}
          />
        </div>
      </Screen>
    );
  }

  // Esperando a que decida la otra parte, o rechazada.
  const counterpart = d.context?.counterpartName;
  const waitingTitle =
    status === "rejected"
      ? "No salió esta vez."
      : d.role === "broker"
        ? "Te ofreciste a ayudar."
        : "Pedida.";
  const waitingBody =
    status === "rejected"
      ? null
      : d.role === "broker"
        ? `Cuando ${counterpart ?? "la otra persona"} acepte, abriréis el canal aquí mismo. No hace falta que hagas nada más.`
        : "Te avisaremos cuando alguien se ofrezca.";
  return (
    <Screen>
      <Title>{waitingTitle}</Title>
      {waitingBody ? <Body dim style={{ marginTop: spacing(3) }}>{waitingBody}</Body> : null}
      <div style={{ marginTop: spacing(6) }}>
        <LinkButton label="Volver" onClick={() => router.push("/home")} color={colors.charcoal} />
      </div>
    </Screen>
  );
}

export default function IntroPage() {
  return (
    <AuthGuard>
      <IntroInner />
    </AuthGuard>
  );
}
