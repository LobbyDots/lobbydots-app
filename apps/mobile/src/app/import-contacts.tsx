import { regionFromE164 } from "@lobbydots/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useImportContacts, useMe } from "@/api/hooks";
import { Body, PrimaryButton, Screen, Title } from "@/components/ui";
import { requestAndReadContacts } from "@/lib/contacts";
import { colors, spacing } from "@/theme/tokens";

type Phase = "idle" | "reading" | "denied" | "ready";

// Pantalla 3 (parte 2) — import de agenda con un toque.
export default function ImportContacts() {
  const router = useRouter();
  const me = useMe();
  const importContacts = useImportContacts();

  const [phase, setPhase] = useState<Phase>("idle");
  const [items, setItems] = useState<{ e164: string; displayName?: string }[]>(
    [],
  );

  const region = me.data ? regionFromE164(me.data.phoneE164) : undefined;

  async function read() {
    setPhase("reading");
    const res = await requestAndReadContacts(region);
    if (!res.granted) {
      setPhase("denied");
      return;
    }
    setItems(res.items);
    setPhase("ready");
  }

  async function importAll() {
    if (items.length > 0) {
      await importContacts.mutateAsync({ contacts: items });
    }
    router.replace("/tiers");
  }

  return (
    <Screen style={{ justifyContent: "space-between" }}>
      <View style={{ flex: 1, justifyContent: "center", gap: spacing(4) }}>
        <Title>Tu agenda</Title>
        {phase === "idle" ? (
          <Body dim>
            Un toque. Tus contactos no se muestran a nadie; solo sirven para
            encontrar caminos.
          </Body>
        ) : null}
        {phase === "reading" ? <Body dim>Leyendo…</Body> : null}
        {phase === "denied" ? (
          <Body dim>Sin permiso de contactos. Puedes continuar sin importar.</Body>
        ) : null}
        {phase === "ready" ? (
          <Body>{items.length} contactos listos.</Body>
        ) : null}
      </View>

      <View style={{ gap: spacing(3) }}>
        {phase === "idle" ? (
          <PrimaryButton label="Importar agenda" onPress={read} />
        ) : null}
        {phase === "ready" ? (
          <PrimaryButton
            label={`Importar ${items.length}`}
            onPress={importAll}
            disabled={importContacts.isPending}
          />
        ) : null}
        {phase === "denied" ? (
          <PrimaryButton
            label="Continuar"
            onPress={() => router.replace("/home")}
          />
        ) : null}
        <Pressable onPress={() => router.replace("/home")}>
          <Text
            style={{
              color: colors.muted,
              textAlign: "center",
              paddingVertical: spacing(2),
            }}
          >
            Omitir por ahora
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
