import type { Member, UpdateMeInput } from "@lobbydots/shared";
import { Injectable } from "@nestjs/common";
import { toMemberDto } from "../common/mappers";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async update(memberId: string, input: UpdateMeInput): Promise<Member> {
    const m = await this.prisma.member.update({
      where: { id: memberId },
      data: { displayName: input.displayName, bio: input.bio ?? null },
    });
    return toMemberDto(m);
  }

  async setPushToken(memberId: string, expoPushToken: string): Promise<void> {
    await this.prisma.member.update({
      where: { id: memberId },
      data: { expoPushToken },
    });
  }
}
