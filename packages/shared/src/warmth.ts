import type { Tier } from "./enums";

/**
 * Entradas del warmth ranking (v1, calculado en código). El objetivo es
 * MAXIMIZAR la calidez del camino, no minimizar saltos. Con 1 salto es trivial;
 * la estructura queda lista para generalizar a warmth-optimal pathfinding en v2.
 */
export interface WarmthInputs {
  /** Tier que el broker le ha puesto al target (1 íntimo … 3 conocido). */
  brokerTierForTarget: Tier | null;
  /** El requester tiene al broker en su agenda. */
  requesterKnowsBroker: boolean;
  /** El broker tiene al requester en su agenda. */
  brokerKnowsRequester: boolean;
  /** Requester y broker comparten avalador. */
  sharesVoucher: boolean;
  /** Uno avaló al otro directamente. */
  directVouch: boolean;
}

/** Calidez del camino en [0, 1]. Mayor = más cálido. */
export function warmthScore(i: WarmthInputs): number {
  const tierW =
    i.brokerTierForTarget === 1
      ? 0.5
      : i.brokerTierForTarget === 2
        ? 0.35
        : i.brokerTierForTarget === 3
          ? 0.2
          : 0.1;
  const mutual =
    (i.requesterKnowsBroker ? 0.15 : 0) + (i.brokerKnowsRequester ? 0.1 : 0);
  const vouchW = i.directVouch ? 0.2 : i.sharesVoucher ? 0.1 : 0;
  return Math.min(1, tierW + mutual + vouchW);
}
