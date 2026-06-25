import {
  type ImportContactsResponse,
  normalizeToE164,
  type OwnContact,
  type SetTiersInput,
  type SetTiersResponse,
  type Tier,
} from "@lobbydots/shared";
import { Injectable } from "@nestjs/common";
import { HashingService } from "../hashing/hashing.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
  ) {}

  /** Hashea cada número (HMAC+pepper) y los inserta con dedupe por dueño. */
  async import(
    memberId: string,
    items: { e164: string; displayName?: string }[],
  ): Promise<ImportContactsResponse> {
    const seen = new Set<string>();
    const rows: {
      ownerMemberId: string;
      phoneHash: string;
      displayName: string | null;
      pepperVersion: number;
    }[] = [];

    for (const item of items) {
      // No confiar en el cliente: re-normalizar en servidor antes de hashear.
      const e164 = normalizeToE164(item.e164);
      if (!e164) continue;
      const phoneHash = this.hashing.hash(e164);
      if (seen.has(phoneHash)) continue;
      seen.add(phoneHash);
      rows.push({
        ownerMemberId: memberId,
        phoneHash,
        displayName: item.displayName ?? null,
        pepperVersion: this.hashing.pepperVersion,
      });
    }

    const result = await this.prisma.contact.createMany({
      data: rows,
      skipDuplicates: true, // respeta unique(owner, phone_hash)
    });
    return {
      imported: result.count,
      skipped: items.length - result.count,
    };
  }

  /** Contactos propios para el paso de tiers. Nunca expone phone_hash. */
  async listOwn(memberId: string): Promise<OwnContact[]> {
    const rows = await this.prisma.contact.findMany({
      where: { ownerMemberId: memberId },
      select: { id: true, displayName: true, tier: true, tags: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      tier: (r.tier ?? null) as Tier | null,
      tags: r.tags,
    }));
  }

  /** Asigna tiers. updateMany filtra por dueño → nadie tiera contactos ajenos. */
  async setTiers(
    memberId: string,
    assignments: SetTiersInput["assignments"],
  ): Promise<SetTiersResponse> {
    const results = await this.prisma.$transaction(
      assignments.map((a) =>
        this.prisma.contact.updateMany({
          where: { id: a.contactId, ownerMemberId: memberId },
          data: { tier: a.tier },
        }),
      ),
    );
    const updated = results.reduce((sum, r) => sum + r.count, 0);
    return { updated };
  }
}
