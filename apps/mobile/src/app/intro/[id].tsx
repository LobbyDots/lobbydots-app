import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";
import {
  useApproveIntro,
  useCompleteIntro,
  useIntro,
  useRejectIntro,
} from "@/api/hooks";
import { Body, PrimaryButton, Screen, Title } from "@/components/ui";
import { colors, spacing } from "@/theme/tokens";

// Pantalla 6 — Intro. Propuesta → decisión del gatekeeper → apertura del canal.
// Quién decide: el BROKER (por teléfono) o el REQUESTER (por descripción).
// Identidades y canal SOLO se revelan tras aprobar, y solo a las dos partes.
export default function Intro() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const intro = useIntro(id ?? "");
  const approve = useApproveIntro();
  const reject = useRejectIntro();
  const complete = useCompleteIntro();

  if (intro.isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.ink} />
      </Screen>
    );
  }

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
      <Screen style={{ justifyContent: "space-between" }}>
        <View style={{ flex: 1, justifyContent: "center", gap: spacing(4) }}>
          <Title>
            {d.role === "requester"
              ? `${reveal.counterpartName} te presenta.`
              : `Presenta a ${reveal.counterpartName}.`}
          </Title>
          <Body dim>{reveal.draft}</Body>
        </View>
        <View style={{ gap: spacing(3) }}>
          <PrimaryButton
            label="Abrir WhatsApp"
            onPress={() => void Linking.openURL(reveal.channel.url)}
          />
          {status === "approved" ? (
            <Pressable
              onPress={() => complete.mutate(d.intro.id)}
              disabled={complete.isPending}
            >
              <Text style={decisionLinkStyle}>Marcar como hecha</Text>
            </Pressable>
          ) : (
            <Body dim>Completada.</Body>
          )}
        </View>
      </Screen>
    );
  }

  // Te toca decidir (gatekeeper) — broker (teléfono) o requester (descripción).
  if (d.canDecide && d.context) {
    const isOffer = d.role === "requester"; // descripción: alguien se ofrece
    return (
      <Screen style={{ justifyContent: "space-between" }}>
        <View style={{ flex: 1, justifyContent: "center", gap: spacing(3) }}>
          <Title>
            {isOffer
              ? `${d.context.counterpartName} se ofrece a ayudarte.`
              : `${d.context.counterpartName} busca una presentación.`}
          </Title>
          {isOffer && d.context.targetDesc ? (
            <Body>Buscabas: “{d.context.targetDesc}”.</Body>
          ) : null}
          <Body dim>
            {isOffer
              ? "Si aceptas, os conectáis para que haga la intro."
              : "Solo si te apetece. Nada se revela hasta que aceptes."}
          </Body>
        </View>
        <View style={{ gap: spacing(3) }}>
          <PrimaryButton
            label="Aceptar"
            onPress={() => approve.mutate(d.intro.id)}
            disabled={approve.isPending}
          />
          <Pressable
            onPress={() => {
              reject.mutate(d.intro.id);
              router.back();
            }}
            disabled={reject.isPending}
          >
            <Text style={decisionLinkStyle}>Ahora no</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  // Esperando a que decida la otra parte, o rechazada.
  return (
    <Screen>
      <Title>{status === "rejected" ? "No salió esta vez." : "Pedida."}</Title>
      {status !== "rejected" ? (
        <Body dim>Te avisaremos cuando haya respuesta.</Body>
      ) : null}
    </Screen>
  );
}

const decisionLinkStyle = {
  color: colors.muted,
  textAlign: "center" as const,
  paddingVertical: spacing(2),
};
