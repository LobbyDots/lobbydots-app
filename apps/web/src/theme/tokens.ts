// Tokens de diseño (espejo de apps/mobile/src/theme/tokens.ts) — tinta/carbón
// sobre crema, un acento sobrio. Las familias apuntan a las CSS vars de next/font.

export const colors = {
  ink: "#1A1A18",
  charcoal: "#3A3A37",
  muted: "#8A8578",
  hairline: "#E2DDD2",
  cream: "#F4F1EA",
  paper: "#FBFAF6",
  oxblood: "#6B2B2B",
} as const;

/** Escala base de 4px (número = px en estilos inline de React DOM). */
export const spacing = (n: number): number => n * 4;

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

export const type = {
  display: 40,
  title: 26,
  body: 16,
  caption: 13,
} as const;

/** Familias: serif editorial (Fraunces) + sans limpia (Hanken), vía CSS vars. */
export const fonts = {
  serif: "var(--font-serif)",
  sans: "var(--font-sans)",
} as const;
