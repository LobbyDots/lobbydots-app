import { createHash, randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type {
  ConsumeInviteInput,
  ConsumeInviteResponse,
  CreateInviteResponse,
  VoucherInfo,
} from "@lobbydots/shared";
import { toMemberDto } from "../common/mappers";
import { HashingService } from "../hashing/hashing.service";
import { PrismaService } from "../prisma/prisma.service";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
  ) {}

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /** Genera un enlace de invitación de un solo uso; gasta una invitación. */
  async create(inviterId: string): Promise<CreateInviteResponse> {
    // Decremento atómico: falla si no quedan invitaciones.
    const spent = await this.prisma.member.updateMany({
      where: { id: inviterId, invitesRemaining: { gt: 0 } },
      data: { invitesRemaining: { decrement: 1 } },
    });
    if (spent.count === 0) {
      throw new ForbiddenException("No te quedan invitaciones.");
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    await this.prisma.invite.create({
      data: { inviterId, tokenHash: this.hashToken(token), expiresAt },
    });

    const baseUrl = process.env.PUBLIC_APP_URL ?? "https://lobbydots.app";
    return { inviteUrl: `${baseUrl}/i/${token}`, expiresAt: expiresAt.toISOString() };
  }

  /** Público: nombre del avalador ("Marcos responde por ti"). Sin PII. */
  async voucher(token: string): Promise<VoucherInfo> {
    const invite = await this.prisma.invite.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });
    if (!invite || invite.status !== "pending" || invite.expiresAt < new Date()) {
      return { valid: false, voucherName: null };
    }
    const inviter = await this.prisma.member.findUnique({
      where: { id: invite.inviterId },
    });
    return { valid: true, voucherName: inviter?.displayName ?? null };
  }

  /** Consume la invitación: crea Member (mini-perfil) + Vouch en una transacción. */
  async consume(
    token: string,
    authUserId: string,
    authPhoneE164: string,
    input: ConsumeInviteInput,
  ): Promise<ConsumeInviteResponse> {
    const phoneHash = this.hashing.hash(authPhoneE164);

    const member = await this.prisma.$transaction(async (tx) => {
      const invite = await tx.invite.findUnique({
        where: { tokenHash: this.hashToken(token) },
      });
      if (
        !invite ||
        invite.status !== "pending" ||
        invite.expiresAt < new Date()
      ) {
        throw new BadRequestException("Invitación no válida o caducada.");
      }
      if (invite.inviteePhoneE164 && invite.inviteePhoneE164 !== authPhoneE164) {
        throw new ForbiddenException("Esta invitación es para otro número.");
      }

      const existing = await tx.member.findFirst({
        where: { OR: [{ authUserId }, { phoneE164: authPhoneE164 }] },
      });
      if (existing) {
        throw new ConflictException("Ya eres miembro.");
      }

      const created = await tx.member.create({
        data: {
          authUserId,
          phoneE164: authPhoneE164,
          phoneHash,
          pepperVersion: this.hashing.pepperVersion,
          displayName: input.displayName,
          bio: input.bio ?? null,
        },
      });
      await tx.vouch.create({
        data: { inviterId: invite.inviterId, inviteeId: created.id },
      });
      await tx.invite.update({
        where: { id: invite.id },
        data: { status: "consumed", consumedBy: created.id },
      });
      return created;
    });

    return { member: toMemberDto(member) };
  }
}
