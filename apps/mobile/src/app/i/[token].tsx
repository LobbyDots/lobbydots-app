import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useVoucher } from "@/api/hooks";
import { Body, Display, PrimaryButton, Screen, Title } from "@/components/ui";
import { colors } from "@/theme/tokens";

// Pantalla 1 — invitación/aval. Nombra al avalador: "Marcos responde por ti."
export default function Invitation() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const voucher = useVoucher(token ?? "");

  if (voucher.isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.ink} />
      </Screen>
    );
  }

  if (!voucher.data?.valid) {
    return (
      <Screen>
        <Title>Esta invitación ya no es válida.</Title>
      </Screen>
    );
  }

  return (
    <Screen style={{ justifyContent: "space-between" }}>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Display>{voucher.data.voucherName} responde por ti.</Display>
      </View>
      <PrimaryButton
        label="Continuar"
        onPress={() =>
          router.push({ pathname: "/otp", params: { token: token ?? "" } })
        }
      />
    </Screen>
  );
}
