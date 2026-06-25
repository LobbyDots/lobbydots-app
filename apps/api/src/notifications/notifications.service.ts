import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Envío best-effort de un push a un miembro (si tiene token). Nunca lanza. */
  async notify(
    memberId: string,
    title: string,
    body: string,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { expoPushToken: true },
    });
    if (!member?.expoPushToken) return;

    try {
      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: member.expoPushToken,
          title,
          body,
          data,
        }),
      });
    } catch (err) {
      this.logger.warn(`No se pudo enviar push a ${memberId}: ${String(err)}`);
    }
  }
}
