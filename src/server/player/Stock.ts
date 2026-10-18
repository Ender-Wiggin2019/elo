import {LawSuit} from '../cards/promo/LawSuit';
import {IPlayer} from '../IPlayer';
import {Resource, StandardResource} from '../../common/Resource';
import {CrashSiteCleanup} from '../cards/promo/CrashSiteCleanup';
import {CardName} from '../../common/cards/CardName';
import {Phase} from '../../common/Phase';
import {Units} from '../../common/Units';
import {EnergyStation} from '../cards/eros/EnergyStation';
import {MoltenReserve} from '../cards/commission/MoltenReserve';
import {From, isFromPlayer} from '../logs/From';
import {BaseStock} from './StockBase';
import {ICard} from '../cards/ICard';

export class Stock extends BaseStock {
  private spending?: {units: Units, cards: Array<ICard>};

  /** Combines the price and printed resource costs of one card or standard project. */
  public spendTogether<T>(pay: () => T): T {
    if (this.spending !== undefined) {
      return pay();
    }
    // Capture the existing tableau so a newly played card cannot reward its own payment.
    const spending = {units: Units.of({}), cards: [...this.player.tableau]};
    this.spending = spending;
    try {
      return pay();
    } finally {
      this.spending = undefined;
      this.notifySpent(spending.units, spending.cards);
    }
  }

  /** Pays one resource cost, distinct from resources lost or stolen. */
  public spend(resource: Resource | StandardResource, amount: number, options?: {log?: boolean, from?: From}) {
    this.spendUnits(Units.of({[resource]: amount}), options);
  }

  /** Pays a cost as one event, even when it contains several resource types. */
  public spendUnits(units: Units, options?: {log?: boolean, from?: From}) {
    const before = this.asUnits();
    this.adjust(Units.negative(units), options);
    const spent = Units.of({});
    for (const key of Units.keys) {
      spent[key] = Math.max(0, before[key] - this[key]);
    }
    if (this.spending !== undefined) {
      for (const key of Units.keys) {
        this.spending.units[key] += spent[key];
      }
    } else {
      this.notifySpent(spent, this.player.tableau);
    }
  }

  private notifySpent(spent: Units, cards: Iterable<ICard>) {
    if (!Units.isEmpty(spent)) {
      for (const card of cards) {
        card.onResourcesSpent?.(this.player, spent);
      }
    }
  }

  public add(
    resource: Resource | StandardResource,
    amount : number,
    options? : {
      log?: boolean,
      from? : From,
      stealing?: boolean
    }) {
    if (amount === 0) {
      return;
    }
    // When amount is negative, sometimes the amount being asked to be removed is more than the player has.
    // delta represents an adjusted amount which basically declares that a player cannot lose more resources
    // then they have.
    const playerAmount = this[resource];
    const delta = (amount >= 0) ? amount : Math.max(amount, -playerAmount);
    // Lots of calls to addResource used to deduct resources are done by cards and/or players stealing some
    // fixed amount which, if the current player doesn't have it. it just removes as much as possible.
    // (eg. Sabotage.) That's what the delta above, is for.
    //
    // But if the intent is to remove the amount requested (spending 8 plants to place a greenery) then there
    // better be 8 units. The code outside this call is responsible in those cases for making sure the player
    // has enough resource units to pay for an action.
    //
    // In those cases, if the player calls this, but the logic is wrong, the player could wind up with a
    // negative amount of units. This will break other actions in the game. So instead, this method deducts as
    // much as possible, and lots that there was a game error.
    //
    // The shortcut for knowing if this is the case is when `options.from` is undefined.
    if (delta !== amount && options?.from === undefined) {
      this.player.game.logIllegalState(
        `Adjusting ${amount} ${resource} when player has ${playerAmount}`,
        {player: {color: this.player.color, id: this.player.id, name: this.player.name}, resource, amount});
    }
    this[resource] += delta;

    if (options?.log === true) {
      this.logUnitDelta(resource, delta, /* production*/ false, options.from, options.stealing);
    }

    const from = options?.from;
    if (isFromPlayer(from)) {
      LawSuit.resourceHook(this.player, delta, from.player);
      CrashSiteCleanup.resourceHook(this.player, resource as Resource, delta, from.player);

      if (resource === Resource.PLANTS && delta < 0 && from.player.id !== this.player.id) {
        EnergyStation.resourceHook(this.player, resource as Resource, delta, from.player);
        for (const card of this.player.tableau) {
          card.onPlantRemoved?.(this.player, -delta);
        }
      }
      // Mons Insurance hook
      if ( delta < 0 && from.player.id !== this.player.id) {
        this.player.resolveInsurance();
      }
    }


    // SOLARPLANT hook
    if (delta < 0 && resource === Resource.ENERGY && this.player.game.phase === Phase.ACTION ) {
      const solarPlant = this.player.playedCards.get(CardName.SOLARPLANT);
      if (solarPlant !== undefined) {
        this.player.defer(() => this.add(Resource.HEAT, -delta, {log: true}));
      }
    }

    // MOLTEN_RESERVE hook: when gaining heat, gain 1 MC (once per gain event)
    if (delta > 0 && resource === Resource.HEAT) {
      const moltenReserve = this.player.playedCards.get(CardName.MOLTEN_RESERVE);
      if (moltenReserve !== undefined) {
        this.player.defer(() => MoltenReserve.onHeatGain(this.player));
      }
    }
  }

  /**
   * `from` steals up to `qty` units of `resource` from this player. Or, at least as
   * much as possible.
   */
  public steal(resource: Resource | StandardResource, qty: number, thief: IPlayer, options?: {log?: boolean}) {
    const qtyToSteal = Math.min(this[resource], qty);
    if (qtyToSteal > 0) {
      this.deduct(resource, qtyToSteal, {log: options?.log ?? true, from: {player: thief}, stealing: true});
      thief.stock.add(resource, qtyToSteal);
    }
  }
}
