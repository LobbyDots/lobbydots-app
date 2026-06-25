# Lobbydots

App móvil (iOS + Android) para un **grupo cerrado y avalado**. Alta solo por
invitación con aval → OTP de teléfono → import de agenda (un toque) → petición de
intro (persona o descripción) → matching de 1 salto con *warmth ranking* → intro
que el broker aprueba antes de revelar nada → entrega fuera de la app
(WhatsApp/email). **No hay directorio de miembros: la red se atraviesa, no se navega.**

> Spec de producto: [`spec-v1.md`](./spec-v1.md).

## Stack (últimas versiones, jun 2026)

| Capa | Tecnología |
|---|---|
| App | Expo **SDK 56** · React Native 0.85 (New Arch) · expo-router · TanStack Query 5 · Zustand 5 |
| Backend | **NestJS 11** · Prisma 7 (driver `pg`, sin Rust) · zod |
| DB + Auth | **Supabase** (Postgres 17 + OTP de teléfono vía Twilio) |
| Monorepo | pnpm workspaces + Turborepo · Node 24 LTS · TypeScript |

Clave de unión del grafo: **teléfono normalizado a E.164, hasheado** (HMAC-SHA256
con un *pepper* de servidor). El cliente normaliza; el servidor hashea. El pepper
nunca viaja en la app. _(Limitación honesta: el espacio de números es pequeño y el
hash es brute-forceable — aceptable solo para una beta cerrada, ver spec §9.)_

## Estructura

```
lobbydots/
├─ apps/
│  ├─ api/        NestJS — único gateway de datos/lógica (auth, invites, contacts,
│  │             requests, matching, intros, notifications, hashing)
│  └─ mobile/     Expo — 6 pantallas (invitación, OTP, onboarding, home, camino, intro)
├─ packages/shared/   contrato zod + normalización de teléfono + warmthScore
└─ supabase/migrations/   esquema (fuente de verdad del DDL) + RLS deny-all
```

## Requisitos

- **Node 24 LTS** (`nvm use` lee `.nvmrc`), **pnpm 11**.
- Un proyecto **Supabase** (dev) con **Auth → Phone** habilitado y **Twilio** como
  proveedor de SMS (se configura en el dashboard de Supabase).
- Para push e instalación nativa: cuenta **Expo/EAS** (`eas init` añade el `projectId`).
- _No se usa Docker_ (el stack local de Supabase lo requiere): trabajamos contra el
  proyecto Supabase hosted.

## Puesta en marcha

```bash
pnpm install

# 1) Variables de entorno (rellena con tu proyecto Supabase + Twilio)
cp .env.example .env                  # referencia
#   apps/api/.env     → DATABASE_URL, DIRECT_URL, HASH_PEPPER, SUPABASE_URL, SUPABASE_JWT_SECRET…
#   apps/mobile/.env  → EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_API_URL

# 2) Esquema en la base de datos (Supabase CLI, sin Docker)
pnpm dlx supabase login
pnpm dlx supabase link --project-ref <TU_REF>
pnpm db:push                          # aplica supabase/migrations/*.sql al remoto

# 3) Cliente Prisma (introspección desde la DB ya migrada)
pnpm --filter @lobbydots/api prisma:pull
pnpm --filter @lobbydots/api prisma:generate
```

## Desarrollo

```bash
# API (NestJS)  →  http://localhost:3000  (GET /health = ok)
pnpm --filter @lobbydots/api dev

# App (Expo)  —  necesita dev client (contacts/notifications/New Arch son nativos)
pnpm --filter @lobbydots/mobile ios       # o android
#   primera vez:  cd apps/mobile && eas init && eas build --profile development
```

## Verificación

```bash
pnpm typecheck            # turbo: shared + api + mobile
pnpm --filter @lobbydots/api test         # unit/e2e (necesita una DB de test)
```

- **Garantía de privacidad** (test obligatorio): ninguna respuesta hacia el
  *requester* debe contener filas de contacto ni `phone_hash`. Los caminos
  (`GET /requests/:id/paths`) solo devuelven `{ brokerId, brokerDisplayName, warmth,
  reasons }`. Identidades y canal de la intro **solo** se revelan tras la aprobación
  del broker, y solo a las dos partes (`apps/api/src/intros/intros.service.ts`).
- Deep links de invitación: Universal Links (iOS) + App Links (Android) sobre
  `lobbydots.app`. Hostea `/.well-known/apple-app-site-association` y `assetlinks.json`
  en ese dominio. _(Firebase Dynamic Links está descontinuado desde ago-2025.)_

## Decisiones (spec §11)

1. **Backend:** Supabase + NestJS (TypeScript de punta a punta).
2. **Hash:** normalizar en cliente (libphonenumber-js), HMAC con *pepper* en servidor.
3. **Nombre:** Lobbydots.
4. **SMS:** Twilio vía Supabase Auth.

## Ficheros clave

- `packages/shared/src/phone.ts` — normalización E.164 (clave de unión).
- `packages/shared/src/warmth.ts` — `warmthScore` (ranking de calidez).
- `apps/api/src/matching/matching.service.ts` — matching de 1 salto.
- `apps/api/src/hashing/hashing.service.ts` — HMAC + pepper.
- `apps/api/src/intros/intros.service.ts` — revelado role-aware (privacidad).
- `supabase/migrations/` — esquema + índices + RLS.
