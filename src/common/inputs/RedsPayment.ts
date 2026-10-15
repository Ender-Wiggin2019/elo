export type RedsPaymentResource = 'megacredits' | 'heat' | 'titanium';

export type RedsPaymentRates = Record<RedsPaymentResource, number>;
export type RedsPaymentUnits = Record<RedsPaymentResource, number>;

export type RedsPaymentReserve = {
  /** Resources reserved for the Reds surcharge. */
  units: RedsPaymentUnits,
  /** Value of those resources when paying the card. */
  cardValue: number,
};

export type RedsPaymentInput = {
  redsCost: number,
  available: RedsPaymentUnits,
  /** The value of each resource when paying the Reds surcharge. */
  redsRates: RedsPaymentRates,
  /** The value of each resource when paying the current card. */
  cardRates: RedsPaymentRates,
};

/**
 * Finds an affordable Reds surcharge payment that leaves the most useful
 * resources for the current card. Resource units are discrete, so a simple
 * bounded enumeration is more reliable than subtracting the surcharge from
 * a single aggregate value. The bounds are small because no candidate needs
 * more units than are needed to cover the surcharge by itself.
 */
export function findRedsPaymentReserve(input: RedsPaymentInput): RedsPaymentReserve | undefined {
  if (input.redsCost <= 0) {
    return {units: {megacredits: 0, heat: 0, titanium: 0}, cardValue: 0};
  }

  let best: RedsPaymentReserve | undefined;
  const resources: Array<RedsPaymentResource> = ['megacredits', 'heat', 'titanium'];
  const counts: RedsPaymentUnits = {megacredits: 0, heat: 0, titanium: 0};

  const isBetter = (candidate: RedsPaymentReserve, current: RedsPaymentReserve): boolean => {
    if (candidate.cardValue !== current.cardValue) {
      return candidate.cardValue < current.cardValue;
    }

    const candidateRedsValue = resources.reduce(
      (total, resource) => total + candidate.units[resource] * input.redsRates[resource], 0,
    );
    const currentRedsValue = resources.reduce(
      (total, resource) => total + current.units[resource] * input.redsRates[resource], 0,
    );
    if (candidateRedsValue !== currentRedsValue) {
      return candidateRedsValue < currentRedsValue;
    }

    const candidateUnitCount = resources.reduce((total, resource) => total + candidate.units[resource], 0);
    const currentUnitCount = resources.reduce((total, resource) => total + current.units[resource], 0);
    return candidateUnitCount < currentUnitCount;
  };

  const visit = (index: number, redsValue: number) => {
    if (index === resources.length) {
      if (redsValue < input.redsCost) {
        return;
      }
      const units = {...counts};
      const candidate: RedsPaymentReserve = {
        units,
        cardValue: resources.reduce((total, resource) => total + units[resource] * input.cardRates[resource], 0),
      };
      if (best === undefined || isBetter(candidate, best)) {
        best = candidate;
      }
      return;
    }

    const resource = resources[index];
    const redsRate = input.redsRates[resource];
    const available = Math.max(0, input.available[resource]);
    const maxNeeded = redsRate > 0 ? Math.ceil(input.redsCost / redsRate) : 0;
    const maxCount = Math.min(available, maxNeeded);
    for (let count = 0; count <= maxCount; count++) {
      counts[resource] = count;
      visit(index + 1, redsValue + count * redsRate);
    }
    counts[resource] = 0;
  };

  visit(0, 0);
  return best;
}
