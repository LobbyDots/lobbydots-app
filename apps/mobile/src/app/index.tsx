import { Link, Redirect } from "expo-router";
import { ActivityIndicator } from "react-native";
import { useMe } from "@/api/hooks";
import { useSession } from "@/auth/use-session";
import { Body, Display, Screen } from "@/components/ui";
import { colors, spacing } from "@/theme/tokens";

// Puerta de entrada. Con sesión + Member → app. Si no, la marca, terso y seco.
export default function Index() {
  const { session, loading } = useSession();
  const me = useMe(!!session);

  if (loading || (!!session && me.isLoading)) {
    return (
      <Screen>
        <ActivityIndicator color={colors.ink} />
      </Screen>
    );
  }

  if (session && me.data) {
    return <Redirect href="/home" />;
  }

  return (
    <Screen style={{ justifyContent: "flex-end", paddingBottom: spacing(16) }}>
      <Display>Lobbydots</Display>
      <Body>Por invitación.</Body>
      <Link
        href="/otp"
        style={{
          marginTop: spacing(12),
          color: colors.charcoal,
          fontSize: 16,
        }}
      >
        Ya tengo cuenta · Entrar
      </Link>
      {__DEV__ ? (
        <Link
          href="/dev-login"
          style={{ marginTop: spacing(4), color: colors.muted, fontSize: 14 }}
        >
          · dev login
        </Link>
      ) : null}
    </Screen>
  );
}
