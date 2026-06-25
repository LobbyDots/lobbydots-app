import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useConsumeInvite } from "@/api/hooks";
import { Body, PrimaryButton, Screen, TextField, Title } from "@/components/ui";
import { spacing } from "@/theme/tokens";

// Pantalla 3 (parte 1) — mini-perfil. Consume la invitación → crea Member + Vouch.
// El import de agenda + tiers se añade aquí en F2.
export default function Onboarding() {
  const { token } = useLocalSearchParams<{ token?: string }>();
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
      // Tras el mini-perfil: import de agenda + tiers (§4.2).
      router.replace("/import-contacts");
    } catch {
      // el estado de error se muestra abajo
    }
  }

  return (
    <Screen>
      <View style={{ gap: spacing(6) }}>
        <Title>Quién eres</Title>
        <TextField
          value={name}
          onChangeText={setName}
          placeholder="Tu nombre"
          autoFocus
        />
        <TextField
          value={bio}
          onChangeText={setBio}
          placeholder="Una línea sobre ti (opcional)"
        />
        {consume.isError ? (
          <Body dim>No se pudo completar. Revisa la invitación.</Body>
        ) : null}
        <PrimaryButton
          label="Entrar"
          onPress={finish}
          disabled={consume.isPending || name.trim().length === 0 || !token}
        />
      </View>
    </Screen>
  );
}
