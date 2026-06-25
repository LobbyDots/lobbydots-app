-- ─────────────────────────────────────────────────────────────────────────
-- Lobbydots — esquema inicial (fuente de verdad del DDL).
-- Clave de unión global: teléfono normalizado a E.164, hasheado (HMAC en servidor).
-- RLS = deny-all para roles de cliente (anon/authenticated). NestJS accede con
-- service_role (exento de RLS) y es el único gateway de datos.
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

create type member_status  as enum ('active', 'suspended');
create type request_status as enum ('open', 'matched', 'completed', 'closed');
create type intro_status   as enum ('proposed', 'approved', 'rejected', 'completed');

-- ── Member: el que tiene cuenta ──
create table member (
  id                uuid primary key default gen_random_uuid(),
  auth_user_id      uuid unique references auth.users (id) on delete set null, -- enlace a Supabase Auth
  phone_e164        text not null unique,                 -- verificado por OTP
  phone_hash        text,                                 -- HMAC; para "agenda mutua" en matching
  display_name      text not null,
  bio               text,
  status            member_status not null default 'active',
  invites_remaining int  not null default 3 check (invites_remaining >= 0),
  expo_push_token   text,
  pepper_version    smallint not null default 1,          -- seguro ante rotación de pepper
  created_at        timestamptz not null default now()
);
create index member_phone_hash_idx on member (phone_hash);

-- ── Contact: entrada de agenda importada por un miembro ──
create table contact (
  id              uuid primary key default gen_random_uuid(),
  owner_member_id uuid not null references member (id) on delete cascade,
  phone_hash      text not null,                          -- HMAC-SHA256(E.164, pepper)
  display_name    text,
  tags            text[] not null default '{}',
  tier            smallint check (tier in (1, 2, 3)),     -- nullable hasta el paso de tiers
  pepper_version  smallint not null default 1,
  created_at      timestamptz not null default now(),
  unique (owner_member_id, phone_hash)                    -- dedupe por dueño
);
create index contact_phone_hash_idx on contact (phone_hash);   -- ÍNDICE de matching
create index contact_owner_idx      on contact (owner_member_id);

-- ── Vouch: quién avaló a quién (control de acceso + arista de confianza) ──
create table vouch (
  id         uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references member (id) on delete cascade,
  invitee_id uuid not null references member (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (inviter_id, invitee_id)
);
create index vouch_inviter_idx on vouch (inviter_id);
create index vouch_invitee_idx on vouch (invitee_id);

-- ── Request: una petición de intro ──
create table request (
  id                uuid primary key default gen_random_uuid(),
  requester_id      uuid not null references member (id) on delete cascade,
  target_phone_hash text,
  target_desc       text,
  status            request_status not null default 'open',
  created_at        timestamptz not null default now(),
  check (target_phone_hash is not null or target_desc is not null)
);
create index request_requester_idx          on request (requester_id);
create index request_target_phone_hash_idx  on request (target_phone_hash);

-- ── Intro: la presentación facilitada ──
create table intro (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references request (id) on delete cascade,
  broker_id  uuid not null references member (id) on delete cascade,
  status     intro_status not null default 'proposed',
  created_at timestamptz not null default now()
);
create index intro_request_idx on intro (request_id);
create index intro_broker_idx  on intro (broker_id);

-- ── Invite: estado de servidor del flujo de invitación (no estaba en las 5 tablas) ──
create table invite (
  id                 uuid primary key default gen_random_uuid(),
  inviter_id         uuid not null references member (id) on delete cascade,
  token_hash         text not null unique,                -- se guarda el hash del token, no el token
  invitee_phone_e164 text,                                -- opcional: fijar a un número
  status             text not null default 'pending'
                       check (status in ('pending', 'consumed', 'revoked', 'expired')),
  expires_at         timestamptz not null,
  consumed_by        uuid references member (id),
  created_at         timestamptz not null default now()
);
create index invite_inviter_idx on invite (inviter_id);

-- ── RLS: activar en todas, SIN políticas permisivas (deny-all para anon/authenticated) ──
alter table member  enable row level security;
alter table contact enable row level security;
alter table vouch   enable row level security;
alter table request enable row level security;
alter table intro   enable row level security;
alter table invite  enable row level security;
