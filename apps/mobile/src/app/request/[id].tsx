import type { PathStub } from "@lobbydots/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useIntros, usePaths, useProposeIntro, useRequests } from "@/api/hooks";
import { Body, Screen, Title } from "@/components/ui";
import { colors, spacing, type } from "@/theme/tokens";

// Pantalla 5 — resultados. Por teléfono: caminos ("vía …"). Por descripción:
// "en la red" + ofertas que van llegando. Sin exponer agendas, sin números de calidez.
export default function RequestPaths() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const requests = useRequests();
  const intros = useIntros();
  const paths = usePaths(id ?? "");
  const propose = useProposeIntro();

  const req = (requests.data ?? []).find((r) => r.id === id);

  async function ask(brokerId: string) {
    if (!id) return;
    const intro = await propose.mutateAsync({ requestId: id, brokerId });
    router.push(`/intro/${intro.id}`);
  }

  // ── Petición por descripción: ofertas, no caminos ──
  if (req?.byDescription) {
    const offers = (intros.data ?? []).filter(
      (d) => d.intro.requestId === id && d.role === "requester",
    );
    return (
      <Screen style={{ justifyContent: "flex-start", paddingTop: spacing(12) }}>
        <Title>Tu pregunta está en la red.</Title>
        <Body dim>{req.targetDesc}</Body>
        <View style={{ marginTop: spacing(6), flex: 1 }}>
          {offers.length === 0 ? (
            <Body dim>Aún nadie se ha ofrecido. Te avisaremos.</Body>
          ) : (
            <FlatList
              data={offers}
              keyExtractor={(d) => d.intro.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => router.push(`/intro/${item.intro.id}`)}
                  style={{
                    paddingVertical: spacing(4),
                    borderBottomWidth: 1,
                    borderColor: colors.hairline,
                  }}
                >
                  <Body>
                    {item.context?.counterpartName ?? "Alguien"} se ofrece
                  </Body>
                  <Text style={{ color: colors.muted, fontSize: type.caption }}>
                    {item.intro.status === "proposed"
                      ? "toca para decidir"
                      : item.intro.status}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </Screen>
    );
  }

  // ── Petición por persona: caminos de 1 salto ──
  if (paths.isLoading || requests.isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.ink} />
      </Screen>
    );
  }

  const data = paths.data;
  const hasPaths = (data?.paths.length ?? 0) > 0;
  const heading = data?.direct
    ? "Ya le conoces."
    : hasPaths
      ? "Hay camino."
      : "Aún no hay camino.";

  return (
    <Screen style={{ justifyContent: "flex-start", paddingTop: spacing(12) }}>
      <Title>{heading}</Title>
      {data?.direct ? <Body dim>Esta persona ya está en tu agenda.</Body> : null}
      {!data?.direct && !hasPaths ? (
        <Body dim>Nadie de los tuyos le tiene. Puede cambiar.</Body>
      ) : null}

      <FlatList
        style={{ flex: 1, marginTop: spacing(6) }}
        data={data?.paths ?? []}
        keyExtractor={(p: PathStub) => p.brokerId}
        renderItem={({ item }: { item: PathStub }) => (
          <View
            style={{
              paddingVertical: spacing(4),
              borderBottomWidth: 1,
              borderColor: colors.hairline,
            }}
          >
            <Body>Vía {item.brokerDisplayName}</Body>
            {item.reasons.length > 0 ? (
              <Text
                style={{
                  color: colors.muted,
                  fontSize: type.caption,
                  marginTop: spacing(1),
                }}
              >
                {item.reasons.join(" · ")}
              </Text>
            ) : null}
            <Pressable
              onPress={() => ask(item.brokerId)}
              disabled={propose.isPending}
              style={{ marginTop: spacing(2) }}
            >
              <Text style={{ color: colors.oxblood, fontSize: type.body }}>
                Pedir presentación
              </Text>
            </Pressable>
          </View>
        )}
      />
    </Screen>
  );
}
