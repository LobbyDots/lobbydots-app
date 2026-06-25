import {
  type RegisterPushTokenInput,
  registerPushTokenSchema,
  type UpdateMeInput,
  updateMeSchema,
} from "@lobbydots/shared";
import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import type { Member as PrismaMember } from "@prisma/client";
import { CurrentMember } from "../auth/decorators";
import { toMemberDto } from "../common/mappers";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { MembersService } from "./members.service";

@Controller()
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get("me")
  me(@CurrentMember() member: PrismaMember) {
    return toMemberDto(member);
  }

  @Patch("me")
  update(
    @CurrentMember() member: PrismaMember,
    @Body(new ZodValidationPipe(updateMeSchema)) body: UpdateMeInput,
  ) {
    return this.members.update(member.id, body);
  }

  @Post("me/push-token")
  async setPushToken(
    @CurrentMember() member: PrismaMember,
    @Body(new ZodValidationPipe(registerPushTokenSchema))
    body: RegisterPushTokenInput,
  ) {
    await this.members.setPushToken(member.id, body.expoPushToken);
    return { ok: true };
  }
}
