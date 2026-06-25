// Tokens de diseño — tinta/carbón sobre crema, un acento sobrio, motion lento.
// (La tipografía editorial serif + sans se carga en F5; aquí solo el sistema base.)

export const colors = {
  ink: "#1A1A18",
  charcoal: "#3A3A37",
  muted: "#8A8578",
  hairline: "#E2DDD2",
  cream: "#F4F1EA",
  paper: "#FBFAF6",
  oxblood: "#6B2B2B",
} as const;

/** Escala base de 4px. */
export const spacing = (n: number): number => n * 4;

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

/** Duraciones de animación (ms) — lentas y deliberadas. */
export const motion = { medium: 420, slow: 600 } as const;

export const type = {
  display: 40,
  title: 26,
  body: 16,
  caption: 13,
} as const;

/** Familias de fuente (cargadas en _layout): serif editorial + sans limpia. */
export const fonts = {
  serif: "Fraunces_600SemiBold",
  serifRegular: "Fraunces_400Regular",
  sans: "HankenGrotesk_400Regular",
  sansMedium: "HankenGrotesk_500Medium",
} as const;
