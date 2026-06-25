import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import type { Member as PrismaMember } from "@prisma/client";
import { ALLOW_NO_MEMBER_KEY, IS_PUBLIC_KEY } from "./auth.constants";
import type { AuthedRequest } from "./authed-request";

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const AllowNoMember = () => SetMetadata(ALLOW_NO_MEMBER_KEY, true);

/** Member resuelto por el guard (garantizado en rutas no públicas y con Member). */
export const CurrentMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PrismaMember => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.member as PrismaMember;
  },
);

export const AuthUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.authUserId as string;
  },
);

export const AuthPhoneE164 = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.authPhoneE164 ?? null;
  },
);
