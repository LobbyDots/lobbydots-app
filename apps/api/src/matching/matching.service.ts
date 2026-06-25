import {
  type PathsResponse,
  type PathStub,
  type Tier,
  type WarmthInputs,
  warmthScore,
} from "@lobbydots/shared";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

function intersects(a: Set<string>, b?: Set<string>): boolean {
  if (!b) return false;
  for (const x of a) if (b.has(x)) return true;
  return false;
}

function buildReasons(i: WarmthInputs): string[] {
  const reasons: string[] = [];
  if (i.brokerTierForTarget === 1) reasons.push("Le conoce de cerca");
  else if (i.brokerTierForTarget === 2) reasons.push("Le conoce bien");
  else if (i.brokerTierForTarget === 3) reasons.push("Le conoce");
  if (i.directVouch) reasons.push("Os avaláis");
  else if (i.sharesVoucher) reasons.push("Tenéis aval en común");
  if (i.requesterKnowsBroker || i.brokerKnowsRequester) {
    reasons.push("Os tenéis en la agenda");
  }
  return reasons;
}

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Matching de 1 salto. Devuelve SOLO stubs de camino (broker, nombre, calidez,
   * razones) — jamás filas de contacto ni la agenda de nadie (garantía central).
   */
  async findPaths(
    requesterId: string,
    targetPhoneHash: string,
  ): Promise<PathsResponse> {
    const requester = await this.prisma.member.findUnique({
      where: { id: requesterId },
      select: { phoneHash: true },
    });
    const requesterHash = requester?.phoneHash ?? null;

    // ¿Directo? El target ya está en la agenda del propio requester.
    const direct =
      (await this.prisma.contact.count({
        where: { ownerMemberId: requesterId, phoneHash: targetPhoneHash },
      })) > 0;

    // Brokers: miembros activos (≠ requester) que tienen al target.
    const brokerContacts = await this.prisma.contact.findMany({
      where: {
        phoneHash: targetPhoneHash,
        ownerMemberId: { not: requesterId },
        owner: { status: "active" },
      },
      select: {
        ownerMemberId: true,
        tier: true,
        owner: { select: { displayName: true, phoneHash: true } },
      },
    });
    if (brokerContacts.length === 0) return { direct, paths: [] };

    const brokerIds = brokerContacts.map((b) => b.ownerMemberId);
    const brokerHashes = brokerContacts
      .map((b) => b.owner.phoneHash)
      .filter((h): h is string => h !== null);

    // requester → broker (el requester tiene al broker en su agenda)
    const reqKnowsHashes = new Set(
      brokerHashes.length
        ? (
            await this.prisma.contact.findMany({
              where: {
                ownerMemberId: requesterId,
                phoneHash: { in: brokerHashes },
              },
              select: { phoneHash: true },
            })
          ).map((c) => c.phoneHash)
        : [],
    );

    // broker → requester (el broker tiene al requester en su agenda)
    const brokerKnowsReq = new Set(
      requesterHash
        ? (
            await this.prisma.contact.findMany({
              where: { ownerMemberId: { in: brokerIds }, phoneHash: requesterHash },
              select: { ownerMemberId: true },
            })
          ).map((c) => c.ownerMemberId)
        : [],
    );

    // Avales
    const requesterInviters = new Set(
      (
        await this.prisma.vouch.findMany({
          where: { inviteeId: requesterId },
          select: { inviterId: true },
        })
      ).map((v) => v.inviterId),
    );
    const brokerInviters = new Map<string, Set<string>>();
    for (const v of await this.prisma.vouch.findMany({
      where: { inviteeId: { in: brokerIds } },
      select: { inviteeId: true, inviterId: true },
    })) {
      const set = brokerInviters.get(v.inviteeId) ?? new Set<string>();
      set.add(v.inviterId);
      brokerInviters.set(v.inviteeId, set);
    }
    const directVouch = new Set<string>();
    for (const v of await this.prisma.vouch.findMany({
      where: {
        OR: [
          { inviterId: requesterId, inviteeId: { in: brokerIds } },
          { inviteeId: requesterId, inviterId: { in: brokerIds } },
        ],
      },
      select: { inviterId: true, inviteeId: true },
    })) {
      directVouch.add(v.inviterId === requesterId ? v.inviteeId : v.inviterId);
    }

    const paths: PathStub[] = brokerContacts
      .map((b) => {
        const inputs: WarmthInputs = {
          brokerTierForTarget: (b.tier ?? null) as Tier | null,
          requesterKnowsBroker: b.owner.phoneHash
            ? reqKnowsHashes.has(b.owner.phoneHash)
            : false,
          brokerKnowsRequester: brokerKnowsReq.has(b.ownerMemberId),
          sharesVoucher: intersects(
            requesterInviters,
            brokerInviters.get(b.ownerMemberId),
          ),
          directVouch: directVouch.has(b.ownerMemberId),
        };
        return {
          brokerId: b.ownerMemberId,
          brokerDisplayName: b.owner.displayName,
          warmth: warmthScore(inputs),
          reasons: buildReasons(inputs),
        };
      })
      .sort((a, b) => b.warmth - a.warmth);

    return { direct, paths };
  }
}
