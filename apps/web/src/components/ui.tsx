"use client";

import type {
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { colors, fonts, radius, spacing, type } from "@/theme/tokens";

// Primitivas web (espejo de apps/mobile/src/components/ui.tsx) en HTML + estilos
// inline sobre los mismos tokens. Mantiene el aura: ink-on-cream, serif editorial.

export function Screen({
  children,
  justify = "center",
  style,
}: {
  children: ReactNode;
  justify?: CSSProperties["justifyContent"];
  style?: CSSProperties;
}) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        justifyContent: "center",
        background: colors.cream,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          minHeight: "100dvh",
          padding: spacing(7),
          display: "flex",
          flexDirection: "column",
          justifyContent: justify,
          ...style,
        }}
      >
        {children}
      </div>
    </main>
  );
}

export function Display({ children }: { children: ReactNode }) {
  return (
    <h1
      style={{
        fontFamily: fonts.serif,
        fontWeight: 600,
        fontSize: type.display,
        lineHeight: 1.1,
        color: colors.ink,
        margin: 0,
      }}
    >
      {children}
    </h1>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: fonts.serif,
        fontWeight: 600,
        fontSize: type.title,
        lineHeight: 1.2,
        color: colors.ink,
        margin: 0,
      }}
    >
      {children}
    </h2>
  );
}

export function Body({
  children,
  dim,
  style,
}: {
  children: ReactNode;
  dim?: boolean;
  style?: CSSProperties;
}) {
  return (
    <p
      style={{
        fontFamily: fonts.sans,
        fontSize: type.body,
        color: dim ? colors.muted : colors.charcoal,
        lineHeight: 1.5,
        margin: 0,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: fonts.sans,
        color: colors.muted,
        fontSize: type.caption,
        letterSpacing: 1,
      }}
    >
      {children}
    </span>
  );
}

export function PrimaryButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        backgroundColor: disabled ? colors.muted : colors.ink,
        color: colors.cream,
        fontFamily: fonts.sans,
        fontWeight: 500,
        fontSize: type.body,
        border: "none",
        padding: `${spacing(4)}px ${spacing(6)}px`,
        borderRadius: radius.md,
      }}
    >
      {label}
    </button>
  );
}

/** Enlace de texto sobrio (decisiones secundarias: "Ahora no", "Marcar como hecha"). */
export function LinkButton({
  label,
  onClick,
  disabled,
  color = colors.muted,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "none",
        border: "none",
        color,
        fontFamily: fonts.sans,
        fontSize: type.body,
        padding: `${spacing(2)}px 0`,
        textAlign: "center",
        width: "100%",
      }}
    >
      {label}
    </button>
  );
}

export function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        fontFamily: fonts.sans,
        background: "transparent",
        border: "none",
        borderBottom: `1px solid ${colors.hairline}`,
        padding: `${spacing(3)}px 0`,
        fontSize: type.body,
        color: colors.ink,
        outline: "none",
        ...props.style,
      }}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        fontFamily: fonts.sans,
        background: "transparent",
        border: "none",
        borderBottom: `1px solid ${colors.hairline}`,
        padding: `${spacing(3)}px 0`,
        fontSize: type.body,
        color: colors.ink,
        outline: "none",
        resize: "none",
        minHeight: spacing(16),
        ...props.style,
      }}
    />
  );
}

export function Spinner() {
  return (
    <Screen>
      <Body dim>…</Body>
    </Screen>
  );
}
