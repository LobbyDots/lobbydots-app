import {
  type CreateRequestInput,
  normalizeToE164,
  type OpenRequest,
  type PathsResponse,
  type RequestDto,
} from "@lobbydots/shared";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { toRequestDto } from "../common/mappers";
import { HashingService } from "../hashing/hashing.service";
import { MatchingService } from "../matching/matching.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
    private readonly matching: MatchingService,
  ) {}

  async create(
    requesterId: string,
    input: CreateRequestInput,
  ): Promise<RequestDto> {
    let targetPhoneHash: string | null = null;
    if (input.targetE164) {
      const e164 = normalizeToE164(input.targetE164);
      if (!e164) throw new BadRequestException("Teléfono no válido.");
      targetPhoneHash = this.hashing.hash(e164);
    }
    const created = await this.prisma.request.create({
      data: {
        requesterId,
        targetPhoneHash,
        targetDesc: input.targetDesc ?? null,
      },
    });
    return toRequestDto(created);
  }

  async listOwn(requesterId: string): Promise<RequestDto[]> {
    const rows = await this.prisma.request.findMany({
      where: { requesterId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toRequestDto);
  }

  /** Caminos para una petición por persona. Descripción → se resuelve por broadcast (F4). */
  async getPaths(
    requesterId: string,
    requestId: string,
  ): Promise<PathsResponse> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, requesterId },
    });
    if (!request) throw new NotFoundException("Petición no encontrada.");
    if (!request.targetPhoneHash) {
      return { direct: false, paths: [] };
    }
    return this.matching.findPaths(requesterId, request.targetPhoneHash);
  }

  /** Peticiones por descripción abiertas de OTROS miembros, que aún no he ayudado (pull). */
  async listOpenForHelp(memberId: string): Promise<OpenRequest[]> {
    const rows = await this.prisma.request.findMany({
      where: {
        targetPhoneHash: null,
        status: "open",
        requesterId: { not: memberId },
        intros: { none: { brokerId: memberId } },
      },
      include: { requester: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      targetDesc: r.targetDesc ?? "",
      requesterName: r.requester.displayName,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
