import { normalizeToE164 } from "@lobbydots/shared";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Share, Text, View } from "react-native";
import {
  useCreateInvite,
  useCreateRequest,
  useIntros,
  useOpenRequests,
  useRegisterPushToken,
  useRequests,
  useVolunteer,
} from "@/api/hooks";
import { Body, PrimaryButton, Screen, TextField, Title } from "@/components/ui";
import { getExpoPushToken } from "@/lib/push";
import { colors, radius, spacing, type } from "@/theme/tokens";

type Mode = "person" | "desc";

const LABEL = {
  color: colors.muted,
  fontSize: type.caption,
  letterSpacing: 1,
} as const;

// Pantalla 4 — Home. Nueva petición (persona/descripción), tus peticiones,
// lo que tienes que decidir, y preguntas en las que puedes ayudar (pull).
export default function Home() {
  const router = useRouter();
  const requests = useRequests();
  const intros = useIntros();
  const openRequests = useOpenRequests();
  const createRequest = useCreateRequest();
  const createInvite = useCreateInvite();
  const volunteer = useVolunteer();
  const registerPush = useRegisterPushToken();

  const [mode, setMode] = useState<Mode>("person");
  const [phone, setPhone] = useState("");
  const [desc, setDesc] = useState("");
  const [posted, setPosted] = useState(false);

  useEffect(() => {
    let active = true;
    getExpoPushToken()
      .then((token) => {
        if (active && token) registerPush.mutate(token);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cosas que TÚ decides (broker en teléfono, o requester con ofertas en descripción).
  const toDecide = (intros.data ?? []).filter((d) => d.canDecide);
  const openToHelp = (openRequests.data ?? []).slice(0, 3);

  const e164 = normalizeToE164(phone);
  const canSubmit = mode === "person" ? !!e164 : desc.trim().length >= 3;

  async function submit() {
    const input =
      mode === "person"
        ? e164
          ? { targetE164: e164 }
          : null
        : desc.trim().length >= 3
          ? { targetDesc: desc.trim() }
          : null;
    if (!input) return;
    const created = await createRequest.mutateAsync(input);
    if (mode === "desc") {
      // Por descripción no hay "camino" inmediato: la pregunta sale a la red.
      setDesc("");
      setPosted(true);
    } else {
      router.push(`/request/${created.id}`);
    }
  }

  async function invite() {
    const res = await createInvite.mutateAsync();
    await Share.share({ message: res.inviteUrl });
  }

  return (
    <Screen style={{ justifyContent: "flex-start", paddingTop: spacing(12) }}>
      {toDecide.length > 0 ? (
        <Pressable
          onPress={() => router.push(`/intro/${toDecide[0]!.intro.id}`)}
          style={{
            backgroundColor: colors.ink,
            borderRadius: radius.md,
            padding: spacing(4),
            marginBottom: spacing(6),
          }}
        >
          <Text style={{ color: colors.cream, fontSize: type.body }}>
            Tienes algo que decidir
            {toDecide.length > 1 ? ` · ${toDecide.length}` : ""}
          </Text>
        </Pressable>
      ) : null}

      <Title>¿A quién buscas?</Title>

      <View style={{ flexDirection: "row", gap: spacing(2), marginTop: spacing(4) }}>
        <Toggle label="Una persona" active={mode === "person"} onPress={() => setMode("person")} />
        <Toggle label="Una descripción" active={mode === "desc"} onPress={() => setMode("desc")} />
      </View>

      <View style={{ marginTop: spacing(5), gap: spacing(4) }}>
        {mode === "person" ? (
          <TextField value={phone} onChangeText={setPhone} placeholder="Su teléfono" keyboardType="phone-pad" />
        ) : (
          <TextField
            value={desc}
            onChangeText={(t) => {
              setDesc(t);
              setPosted(false);
            }}
            placeholder="Inversor Serie A, fintech, ES"
            multiline
          />
        )}
        <PrimaryButton
          label={mode === "person" ? "Buscar camino" : "Preguntar"}
          onPress={submit}
          disabled={!canSubmit || createRequest.isPending}
        />
        {posted && mode === "desc" ? (
          <Body dim>
            Tu pregunta está en la red. Te avisaremos cuando alguien se ofrezca.
          </Body>
        ) : null}
      </View>

      {openToHelp.length > 0 ? (
        <View style={{ marginTop: spacing(8) }}>
          <Text style={LABEL}>PUEDES AYUDAR</Text>
          {openToHelp.map((r) => (
            <View
              key={r.id}
              style={{
                paddingVertical: spacing(3),
                borderBottomWidth: 1,
                borderColor: colors.hairline,
                gap: spacing(1),
              }}
            >
              <Body>
                {r.requesterName} busca: {r.targetDesc}
              </Body>
              <Pressable onPress={() => volunteer.mutate(r.id)} disabled={volunteer.isPending}>
                <Text style={{ color: colors.oxblood, fontSize: type.body }}>
                  Conozco a alguien
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={[LABEL, { marginTop: spacing(8), marginBottom: spacing(2) }]}>
        TUS PETICIONES
      </Text>
      <FlatList
        style={{ flex: 1 }}
        data={requests.data ?? []}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/request/${item.id}`)}
            style={{ paddingVertical: spacing(3), borderBottomWidth: 1, borderColor: colors.hairline }}
          >
            <Body>
              {item.byDescription
                ? (item.targetDesc ?? "Una descripción")
                : "Una persona concreta"}
            </Body>
            <Text style={{ color: colors.muted, fontSize: type.caption }}>{item.status}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Body dim>Aún no has preguntado nada.</Body>}
      />

      <Pressable onPress={invite} disabled={createInvite.isPending}>
        <Text style={{ color: colors.charcoal, textAlign: "center", paddingVertical: spacing(3) }}>
          Invitar a alguien
        </Text>
      </Pressable>

      {__DEV__ ? (
        <Pressable onPress={() => router.push("/dev-login")}>
          <Text
            style={{
              color: colors.muted,
              textAlign: "center",
              fontSize: type.caption,
              paddingBottom: spacing(1),
            }}
          >
            dev · cambiar cuenta
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function Toggle({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: spacing(2),
        paddingHorizontal: spacing(4),
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: active ? colors.ink : colors.hairline,
        backgroundColor: active ? colors.ink : "transparent",
      }}
    >
      <Text style={{ color: active ? colors.cream : colors.charcoal, fontSize: type.caption }}>
        {label}
      </Text>
    </Pressable>
  );
}
