import {
  type ProposeIntroInput,
  proposeIntroSchema,
  type VolunteerInput,
  volunteerSchema,
} from "@lobbydots/shared";
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { Member as PrismaMember } from "@prisma/client";
import { CurrentMember } from "../auth/decorators";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { IntrosService } from "./intros.service";

@Controller("intros")
export class IntrosController {
  constructor(private readonly intros: IntrosService) {}

  /** Por teléfono: el requester propone un camino. */
  @Post()
  propose(
    @CurrentMember() member: PrismaMember,
    @Body(new ZodValidationPipe(proposeIntroSchema)) body: ProposeIntroInput,
  ) {
    return this.intros.propose(member, body);
  }

  /** Por descripción: un miembro se ofrece como intermediario. */
  @Post("volunteer")
  volunteer(
    @CurrentMember() member: PrismaMember,
    @Body(new ZodValidationPipe(volunteerSchema)) body: VolunteerInput,
  ) {
    return this.intros.volunteer(member, body.requestId);
  }

  @Get()
  list(@CurrentMember() member: PrismaMember) {
    return this.intros.listForMember(member);
  }

  @Get(":id")
  detail(@CurrentMember() member: PrismaMember, @Param("id") id: string) {
    return this.intros.detail(member, id);
  }

  @Post(":id/approve")
  approve(@CurrentMember() member: PrismaMember, @Param("id") id: string) {
    return this.intros.approve(member, id);
  }

  @Post(":id/reject")
  reject(@CurrentMember() member: PrismaMember, @Param("id") id: string) {
    return this.intros.reject(member, id);
  }

  @Post(":id/complete")
  complete(@CurrentMember() member: PrismaMember, @Param("id") id: string) {
    return this.intros.complete(member, id);
  }
}
