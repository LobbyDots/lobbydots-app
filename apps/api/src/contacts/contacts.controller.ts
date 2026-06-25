import {
  type ImportContactsInput,
  importContactsSchema,
  type SetTiersInput,
  setTiersSchema,
} from "@lobbydots/shared";
import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import type { Member as PrismaMember } from "@prisma/client";
import { CurrentMember } from "../auth/decorators";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ContactsService } from "./contacts.service";

@Controller("contacts")
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Post("import")
  importContacts(
    @CurrentMember() member: PrismaMember,
    @Body(new ZodValidationPipe(importContactsSchema)) body: ImportContactsInput,
  ) {
    return this.contacts.import(member.id, body.contacts);
  }

  @Get()
  list(@CurrentMember() member: PrismaMember) {
    return this.contacts.listOwn(member.id);
  }

  @Patch("tiers")
  setTiers(
    @CurrentMember() member: PrismaMember,
    @Body(new ZodValidationPipe(setTiersSchema)) body: SetTiersInput,
  ) {
    return this.contacts.setTiers(member.id, body.assignments);
  }
}
