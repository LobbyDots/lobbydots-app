import type { IntroDto, Member, RequestDto } from "@lobbydots/shared";
import type {
  Intro as PrismaIntro,
  Member as PrismaMember,
  Request as PrismaRequest,
} from "@prisma/client";

/** Member de Prisma → DTO público (lo que el dueño ve en /me). Sin phone_hash. */
export function toMemberDto(m: PrismaMember): Member {
  return {
    id: m.id,
    phoneE164: m.phoneE164,
    displayName: m.displayName,
    bio: m.bio,
    status: m.status,
    invitesRemaining: m.invitesRemaining,
    createdAt: m.createdAt.toISOString(),
  };
}

/** Request de Prisma → DTO. NUNCA expone target_phone_hash. */
export function toRequestDto(r: PrismaRequest): RequestDto {
  return {
    id: r.id,
    status: r.status,
    byDescription: r.targetPhoneHash === null,
    targetDesc: r.targetDesc,
    createdAt: r.createdAt.toISOString(),
  };
}

export function toIntroDto(i: PrismaIntro): IntroDto {
  return {
    id: i.id,
    requestId: i.requestId,
    brokerId: i.brokerId,
    status: i.status,
    createdAt: i.createdAt.toISOString(),
  };
}
