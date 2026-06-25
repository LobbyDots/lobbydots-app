import { type CreateRequestInput, createRequestSchema } from "@lobbydots/shared";
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { Member as PrismaMember } from "@prisma/client";
import { CurrentMember } from "../auth/decorators";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { RequestsService } from "./requests.service";

@Controller("requests")
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post()
  create(
    @CurrentMember() member: PrismaMember,
    @Body(new ZodValidationPipe(createRequestSchema)) body: CreateRequestInput,
  ) {
    return this.requests.create(member.id, body);
  }

  @Get()
  list(@CurrentMember() member: PrismaMember) {
    return this.requests.listOwn(member.id);
  }

  /** Peticiones por descripción que podrías ayudar a resolver (pull, sin push). */
  @Get("open")
  open(@CurrentMember() member: PrismaMember) {
    return this.requests.listOpenForHelp(member.id);
  }

  /** Solo stubs de camino. El requester nunca ve la agenda de nadie. */
  @Get(":id/paths")
  paths(@CurrentMember() member: PrismaMember, @Param("id") id: string) {
    return this.requests.getPaths(member.id, id);
  }
}
