import {Player} from '../Player';
import {SelectHowToPay} from '../inputs/SelectHowToPay';
import {HowToPay} from '../common/inputs/HowToPay';
import {DeferredAction, Priority} from './DeferredAction';
import {Resources} from '../common/Resources';
import {CardName} from '../common/cards/CardName';

export class SelectHowToPayDeferred implements DeferredAction {
  public priority = Priority.DEFAULT;
  constructor(
        public player: Player,
        public amount: number,
        public options: SelectHowToPayDeferred.Options = {},
  ) {}

  private mustPayWithMegacredits() {
    if (this.player.canUseHeatAsMegaCredits && this.player.heat > 0) {
      return false;
    }
    if (this.options.canUseSteel && this.player.steel > 0) {
      return false;
    }
    if (this.options.canUseTitanium && this.player.titanium > 0) {
      return false;
    }
    if (this.options.canUseSeeds ) {
      if ((this.player.corpCard?.name === CardName.SOYLENT_SEEDLING_SYSTEMS && this.player.corpCard?.resourceCount) ?? 0 > 0) {
        return false;
      }
      if ((this.player.corpCard2?.name === CardName.SOYLENT_SEEDLING_SYSTEMS && this.player.corpCard2?.resourceCount) ?? 0 > 0) {
        return false;
      }
    }
    return true;
  }

  public execute() {
    if (this.mustPayWithMegacredits()) {
      this.player.deductResource(Resources.MEGACREDITS, this.amount);
      if (this.options.afterPay !== undefined) {
        this.options.afterPay();
      }
      return undefined;
    }

    return new SelectHowToPay(
      this.options.title || 'Select how to pay for ' + this.amount + ' M€s',
      this.options.canUseSteel || false,
      this.options.canUseTitanium || false,
      this.player.canUseHeatAsMegaCredits,
      this.options.canUseSeeds || false,
      this.amount,
      (howToPay: HowToPay) => {
        this.player.deductResource(Resources.STEEL, howToPay.steel);
        this.player.deductResource(Resources.TITANIUM, howToPay.titanium);
        this.player.deductResource(Resources.MEGACREDITS, howToPay.megaCredits);
        this.player.deductResource(Resources.HEAT, howToPay.heat);
        if (howToPay.seeds > 0 ) {
          if (this.player.corpCard?.name === CardName.SOYLENT_SEEDLING_SYSTEMS) {
            this.player.removeResourceFrom(this.player.corpCard!, howToPay.seeds);
          }
          if (this.player.corpCard2?.name === CardName.SOYLENT_SEEDLING_SYSTEMS) {
            this.player.removeResourceFrom(this.player.corpCard2!, howToPay.seeds);
          }
        }
        if (this.options.afterPay !== undefined) {
          this.options.afterPay();
        }
        return undefined;
      },
    );
  }
}

export namespace SelectHowToPayDeferred {
  export interface Options {
    canUseSteel?: boolean;
    canUseTitanium?: boolean;
    canUseSeeds?: boolean,
    title?: string;
    afterPay?: () => void;
  }
}
