"use client";

import { useParams, useRouter } from "next/navigation";
import { Display, PrimaryButton, Screen, Spinner, Title } from "@/components/ui";
import { useVoucher } from "@/lib/api/hooks";

// Pantalla 1 — invitación/aval. Nombra al avalador: "Marcos responde por ti."
export default function Invitation() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const router = useRouter();
  const voucher = useVoucher(token);

  if (voucher.isLoading) return <Spinner />;

  if (!voucher.data?.valid) {
    return (
      <Screen>
        <Title>Esta invitación ya no es válida.</Title>
      </Screen>
    );
  }

  return (
    <Screen justify="space-between">
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        <Display>{voucher.data.voucherName} responde por ti.</Display>
      </div>
      <PrimaryButton
        label="Continuar"
        onClick={() => router.push(`/otp?token=${encodeURIComponent(token)}`)}
      />
    </Screen>
  );
}
