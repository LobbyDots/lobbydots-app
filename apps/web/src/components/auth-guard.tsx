"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ApiError } from "@/lib/api/client";
import { useMe } from "@/lib/api/hooks";
import { useSession } from "@/lib/use-session";
import { Spinner } from "./ui";

// Guard de Member. Contrato 401-vs-403 del API (auth/supabase-auth.guard):
//  - sin sesión           → /otp
//  - 403 (JWT sin Member) → / (necesita invitación); NO se limpia la sesión
//  - 401 (token inválido) → /otp
// /onboarding NO usa este guard (solo exige sesión + token: @AllowNoMember).
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, loading } = useSession();
  const me = useMe(!loading && !!session);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/"); // sin sesión → landing (hub con Entrar / dev login)
      return;
    }
    if (me.isError) {
      const status = me.error instanceof ApiError ? me.error.status : undefined;
      if (status === 403) router.replace("/");
      else router.replace("/otp");
    }
  }, [loading, session, me.isError, me.error, router]);

  if (loading || !session || me.isLoading || me.isError || !me.data) {
    return <Spinner />;
  }
  return <>{children}</>;
}
