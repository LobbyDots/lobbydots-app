import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { ALLOW_NO_MEMBER_KEY, IS_PUBLIC_KEY } from "./auth.constants";
import type { AuthedRequest } from "./authed-request";
import { SupabaseJwtVerifier } from "./supabase-jwt.verifier";

/**
 * Guard global. Resuelve siempre el Member si hay token; luego aplica la política:
 *  - @Public(): pasa sin más.
 *  - @AllowNoMember(): exige JWT válido pero no Member (consumir invitación).
 *  - por defecto: exige Member activo (un teléfono verificado SIN Member → 403).
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: SupabaseJwtVerifier,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token = this.extractBearer(req);

    if (token) {
      try {
        const claims = await this.verifier.verify(token);
        req.authUserId = claims.sub;
        req.authPhoneE164 = claims.phone ? `+${claims.phone}` : null;
        req.member = await this.prisma.member.findFirst({
          where: {
            OR: [
              { authUserId: claims.sub },
              ...(req.authPhoneE164 ? [{ phoneE164: req.authPhoneE164 }] : []),
            ],
          },
        });
      } catch {
        req.authUserId = undefined;
        req.member = null;
      }
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    if (!req.authUserId) {
      throw new UnauthorizedException("Token ausente o inválido.");
    }

    const allowNoMember = this.reflector.getAllAndOverride<boolean>(
      ALLOW_NO_MEMBER_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (allowNoMember) return true;

    if (!req.member) {
      throw new ForbiddenException("Necesitas una invitación para entrar.");
    }
    if (req.member.status !== "active") {
      throw new ForbiddenException("Tu cuenta está suspendida.");
    }
    return true;
  }

  private extractBearer(req: AuthedRequest): string | null {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return null;
    return header.slice("Bearer ".length).trim() || null;
  }
}
