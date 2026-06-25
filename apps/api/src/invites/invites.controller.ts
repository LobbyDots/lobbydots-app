import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from "@nestjs/common";
import { type ConsumeInviteInput, consumeInviteSchema } from "@lobbydots/shared";
import type { Member as PrismaMember } from "@prisma/client";
import {
  AllowNoMember,
  AuthPhoneE164,
  AuthUserId,
  CurrentMember,
  Public,
} from "../auth/decorators";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { InvitesService } from "./invites.service";

@Controller("invites")
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  /** Miembro existente genera un enlace (gasta una invitación). */
  @Post()
  create(@CurrentMember() member: PrismaMember) {
    return this.invites.create(member.id);
  }

  /** Público: "Marcos responde por ti". */
  @Public()
  @Get(":token/voucher")
  voucher(@Param("token") token: string) {
    return this.invites.voucher(token);
  }

  /** Teléfono verificado (aún sin Member) consume la invitación. */
  @AllowNoMember()
  @Post(":token/consume")
  consume(
    @AuthUserId() authUserId: string,
    @AuthPhoneE164() authPhoneE164: string | null,
    @Param("token") token: string,
    @Body(new ZodValidationPipe(consumeInviteSchema)) body: ConsumeInviteInput,
  ) {
    if (!authPhoneE164) {
      throw new BadRequestException("Falta el teléfono verificado.");
    }
    return this.invites.consume(token, authUserId, authPhoneE164, body);
  }
}
