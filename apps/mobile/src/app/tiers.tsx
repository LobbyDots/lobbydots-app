import type { OwnContact, Tier } from "@lobbydots/shared";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useOwnContacts, useSetTiers } from "@/api/hooks";
import { Body, PrimaryButton, Screen, Title } from "@/components/ui";
import { colors, radius, spacing, type } from "@/theme/tokens";

const TIERS: { value: Tier; label: string }[] = [
  { value: 1, label: "Íntimo" },
  { value: 2, label: "Conoce bien" },
  { value: 3, label: "Conocido" },
];

// Pantalla 3 (parte 3) — el paso de tiers. Señal de alta calidad puesta a mano.
export default function Tiers() {
  const router = useRouter();
  const contacts = useOwnContacts();
  const setTiers = useSetTiers();
  const [assign, setAssign] = useState<Record<string, Tier>>({});

  const initial = useMemo(() => {
    const m: Record<string, Tier> = {};
    for (const c of contacts.data ?? []) if (c.tier) m[c.id] = c.tier;
    return m;
  }, [contacts.data]);

  const current: Record<string, Tier> = { ...initial, ...assign };

  function pick(id: string, tier: Tier) {
    setAssign((a) => ({ ...a, [id]: tier }));
  }

  async function done() {
    const assignments = Object.entries(current).map(([contactId, tier]) => ({
      contactId,
      tier,
    }));
    if (assignments.length > 0) {
      await setTiers.mutateAsync({ assignments });
    }
    router.replace("/home");
  }

  if (contacts.isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.ink} />
      </Screen>
    );
  }

  return (
    <Screen style={{ justifyContent: "flex-start", paddingTop: spacing(10) }}>
      <Title>Tu círculo</Title>
      <Body dim>Ordena a tus más cercanos. Treinta segundos.</Body>

      <FlatList
        style={{ flex: 1, marginTop: spacing(5) }}
        data={contacts.data ?? []}
        keyExtractor={(c: OwnContact) => c.id}
        renderItem={({ item }: { item: OwnContact }) => (
          <View
            style={{
              paddingVertical: spacing(3),
              borderBottomWidth: 1,
              borderColor: colors.hairline,
            }}
          >
            <Body>{item.displayName ?? "—"}</Body>
            <View style={{ flexDirection: "row", gap: spacing(2), marginTop: spacing(2) }}>
              {TIERS.map((t) => {
                const active = current[item.id] === t.value;
                return (
                  <Pressable
                    key={t.value}
                    onPress={() => pick(item.id, t.value)}
                    style={{
                      paddingVertical: spacing(2),
                      paddingHorizontal: spacing(3),
                      borderRadius: radius.pill,
                      borderWidth: 1,
                      borderColor: active ? colors.ink : colors.hairline,
                      backgroundColor: active ? colors.ink : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: active ? colors.cream : colors.charcoal,
                        fontSize: type.caption,
                      }}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      />

      <View style={{ paddingVertical: spacing(4) }}>
        <PrimaryButton
          label="Listo"
          onPress={done}
          disabled={setTiers.isPending}
        />
      </View>
    </Screen>
  );
}
