import type {
  Channel,
  IntroDetail,
  IntroDto,
  ProposeIntroInput,
} from "@lobbydots/shared";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type Member as PrismaMember } from "@prisma/client";
import { toIntroDto } from "../common/mappers";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

type IntroWithParties = Prisma.IntroGetPayload<{
  include: { request: { include: { requester: true } }; broker: true };
}>;

const WITH_PARTIES = {
  request: { include: { requester: true } },
  broker: true,
} as const;

const DRAFT = "Te presento a alguien que vale tu tiempo.";

function whatsappChannel(phoneE164: string, text: string): Channel {
  const number = phoneE164.replace(/^\+/, "");
  return {
    type: "whatsapp",
    url: `https://wa.me/${number}?text=${encodeURIComponent(text)}`,
  };
}

@Injectable()
export class IntrosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** El que decide una intro 'proposed': broker (por teléfono) o requester (por descripción). */
  private gatekeeperId(intro: IntroWithParties): string {
    return intro.request.targetPhoneHash === null
      ? intro.request.requesterId // descripción → decide quien preguntó
      : intro.brokerId; // teléfono → decide el intermediario
  }

  /** POR TELÉFONO: el requester elige un camino → Intro 'proposed', avisa al broker. */
  async propose(
    requester: PrismaMember,
    input: ProposeIntroInput,
  ): Promise<IntroDto> {
    if (input.brokerId === requester.id) {
      throw new BadRequestException("No puedes presentarte a ti mismo.");
    }
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, requesterId: requester.id },
    });
    if (!request) throw new NotFoundException("Petición no encontrada.");

    const broker = await this.prisma.member.findFirst({
      where: { id: input.brokerId, status: "active" },
    });
    if (!broker) throw new NotFoundException("Broker no disponible.");

    const intro = await this.prisma.intro.create({
      data: { requestId: input.requestId, brokerId: input.brokerId, status: "proposed" },
    });
    await this.prisma.request.update({
      where: { id: input.requestId },
      data: { status: "matched" },
    });
    await this.notifications.notify(
      broker.id,
      "Una presentación",
      "Alguien de la red quiere que presentes a alguien.",
      { introId: intro.id },
    );
    return toIntroDto(intro);
  }

  /** POR DESCRIPCIÓN: un miembro se ofrece como intermediario; decide el requester. */
  async volunteer(member: PrismaMember, requestId: string): Promise<IntroDto> {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException("Petición no encontrada.");
    if (request.targetPhoneHash !== null) {
      throw new BadRequestException("Esa petición no es por descripción.");
    }
    if (request.requesterId === member.id) {
      throw new BadRequestException("Es tu propia petición.");
    }
    const dup = await this.prisma.intro.findFirst({
      where: { requestId, brokerId: member.id },
    });
    if (dup) throw new ConflictException("Ya te has ofrecido.");

    const intro = await this.prisma.intro.create({
      data: { requestId, brokerId: member.id, status: "proposed" },
    });
    await this.notifications.notify(
      request.requesterId,
      "Alguien puede ayudarte",
      `${member.displayName} se ofrece a ayudarte.`,
      { introId: intro.id },
    );
    return toIntroDto(intro);
  }

  /** El gatekeeper acepta: SOLO aquí se revela (a ambas partes) la otra parte + canal. */
  async approve(member: PrismaMember, introId: string): Promise<IntroDetail> {
    const intro = await this.load(introId);
    if (member.id !== this.gatekeeperId(intro)) {
      throw new ForbiddenException("No te toca decidir esta intro.");
    }
    if (intro.status !== "proposed") {
      throw new BadRequestException("Esta intro ya está resuelta.");
    }
    await this.prisma.intro.update({
      where: { id: introId },
      data: { status: "approved" },
    });
    await this.prisma.request.update({
      where: { id: intro.requestId },
      data: { status: "matched" },
    });
    const otherId =
      member.id === intro.request.requesterId
        ? intro.brokerId
        : intro.request.requesterId;
    await this.notifications.notify(otherId, "Aceptada", "Seguís adelante.", {
      introId,
    });
    return this.detailFrom(member, await this.load(introId));
  }

  async reject(member: PrismaMember, introId: string): Promise<IntroDto> {
    const intro = await this.load(introId);
    if (member.id !== this.gatekeeperId(intro)) {
      throw new ForbiddenException("No te toca decidir esta intro.");
    }
    if (intro.status !== "proposed") {
      throw new BadRequestException("Esta intro ya está resuelta.");
    }
    const updated = await this.prisma.intro.update({
      where: { id: introId },
      data: { status: "rejected" },
    });
    // La petición sigue abierta (otros pueden ofrecerse / proponerse).
    await this.prisma.request.update({
      where: { id: intro.requestId },
      data: { status: "open" },
    });
    return toIntroDto(updated);
  }

  /** Cualquiera de las dos partes marca la intro como completada (toque manual v1). */
  async complete(member: PrismaMember, introId: string): Promise<IntroDto> {
    const intro = await this.load(introId);
    this.assertParty(member, intro);
    if (intro.status !== "approved") {
      throw new BadRequestException("La intro aún no está aprobada.");
    }
    const updated = await this.prisma.intro.update({
      where: { id: introId },
      data: { status: "completed" },
    });
    await this.prisma.request.update({
      where: { id: intro.requestId },
      data: { status: "completed" },
    });
    return toIntroDto(updated);
  }

  async detail(member: PrismaMember, introId: string): Promise<IntroDetail> {
    const intro = await this.load(introId);
    this.assertParty(member, intro);
    return this.detailFrom(member, intro);
  }

  async listForMember(member: PrismaMember): Promise<IntroDetail[]> {
    const intros = await this.prisma.intro.findMany({
      where: {
        OR: [{ brokerId: member.id }, { request: { requesterId: member.id } }],
      },
      include: WITH_PARTIES,
      orderBy: { createdAt: "desc" },
    });
    return intros.map((i) => this.detailFrom(member, i));
  }

  // ── helpers ──
  private async load(introId: string): Promise<IntroWithParties> {
    const intro = await this.prisma.intro.findUnique({
      where: { id: introId },
      include: WITH_PARTIES,
    });
    if (!intro) throw new NotFoundException("Intro no encontrada.");
    return intro;
  }

  private assertParty(member: PrismaMember, intro: IntroWithParties): void {
    const isParty =
      intro.brokerId === member.id ||
      intro.request.requesterId === member.id;
    if (!isParty) throw new ForbiddenException("No formas parte de esta intro.");
  }

  private detailFrom(
    member: PrismaMember,
    intro: IntroWithParties,
  ): IntroDetail {
    const isRequester = intro.request.requesterId === member.id;
    const role = isRequester ? "requester" : "broker";
    const byDescription = intro.request.targetPhoneHash === null;
    const canDecide =
      intro.status === "proposed" && member.id === this.gatekeeperId(intro);
    const counterpart = isRequester ? intro.broker : intro.request.requester;

    const context =
      intro.status === "proposed"
        ? {
            counterpartName: counterpart.displayName,
            targetDesc: intro.request.targetDesc,
          }
        : null;

    let reveal: IntroDetail["reveal"] = null;
    if (intro.status === "approved" || intro.status === "completed") {
      reveal = {
        counterpartName: counterpart.displayName,
        draft: DRAFT,
        channel: whatsappChannel(counterpart.phoneE164, DRAFT),
      };
    }

    return { intro: toIntroDto(intro), role, byDescription, canDecide, context, reveal };
  }
}
