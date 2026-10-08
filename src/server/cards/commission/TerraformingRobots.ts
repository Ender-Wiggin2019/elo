import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {Resource} from '../../../common/Resource';
import {Units} from '../../../common/Units';
import {MAX_OXYGEN_LEVEL, MAX_TEMPERATURE} from '../../../common/constants';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {IActionCard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SelectPaymentDeferred} from '../../deferredActions/SelectPaymentDeferred';
import {TITLES} from '../../inputs/titles';
import {Size} from '../../../common/cards/render/Size';
import {digit} from '../Options';

const ENERGY_COST = 3;
const MEGACREDIT_COST = 8;

export class TerraformingRobots extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      name: CardName.TERRAFORMING_ROBOTS_COMMISSION,
      type: CardType.ACTIVE,
      tags: [Tag.POWER, Tag.BUILDING],
      cost: 7,
      requirements: {tag: Tag.POWER, count: 1},

      metadata: {
        cardNumber: 'XB72',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 3 energy to raise temperature 1 step or oxygen 1 step.', (eb) => {
            eb.energy(ENERGY_COST, {digit, size: Size.SMALL}).startAction
              .temperature(1, {size: Size.SMALL}).or(Size.SMALL).oxygen(1, {size: Size.SMALL});
          }).br;
          b.action('Spend 8 M€ to raise temperature 1 step or oxygen 1 step.', (eb) => {
            eb.megacredits(MEGACREDIT_COST, {size: Size.SMALL}).startAction
              .temperature(1, {size: Size.SMALL}).or(Size.SMALL).oxygen(1, {size: Size.SMALL});
          });
        }),
        description: 'Requires 1 power tag.',
      },
    });
  }

  private canRaiseTemperature(player: IPlayer): boolean {
    return player.game.getTemperature() < MAX_TEMPERATURE;
  }

  private canRaiseOxygen(player: IPlayer): boolean {
    return player.game.getOxygenLevel() < MAX_OXYGEN_LEVEL;
  }

  private canPayEnergy(player: IPlayer, parameter: 'temperature' | 'oxygen'): boolean {
    return player.canAfford({
      cost: 0,
      reserveUnits: Units.of({energy: ENERGY_COST}),
      tr: {[parameter]: 1},
    });
  }

  private canPayMegacredits(player: IPlayer, parameter: 'temperature' | 'oxygen'): boolean {
    return player.canAfford({
      cost: MEGACREDIT_COST,
      tr: {[parameter]: 1},
    });
  }

  public canAct(player: IPlayer): boolean {
    return (this.canRaiseTemperature(player) &&
      (this.canPayEnergy(player, 'temperature') || this.canPayMegacredits(player, 'temperature'))) ||
      (this.canRaiseOxygen(player) &&
      (this.canPayEnergy(player, 'oxygen') || this.canPayMegacredits(player, 'oxygen')));
  }

  private raise(player: IPlayer, parameter: 'temperature' | 'oxygen'): undefined {
    if (parameter === 'temperature') {
      player.game.increaseTemperature(player, 1);
    } else {
      player.game.increaseOxygenLevel(player, 1);
    }
    return undefined;
  }

  private payEnergyAndRaise(player: IPlayer, parameter: 'temperature' | 'oxygen'): undefined {
    player.stock.deduct(Resource.ENERGY, ENERGY_COST);
    return this.raise(player, parameter);
  }

  private payMegacreditsAndRaise(player: IPlayer, parameter: 'temperature' | 'oxygen'): undefined {
    player.game.defer(new SelectPaymentDeferred(player, MEGACREDIT_COST, {
      title: TITLES.payForCardAction(this.name),
    }).andThen(() => this.raise(player, parameter)));
    return undefined;
  }

  private optionForEnergy(player: IPlayer, parameter: 'temperature' | 'oxygen'): SelectOption | undefined {
    const canRaise = parameter === 'temperature' ? this.canRaiseTemperature(player) : this.canRaiseOxygen(player);
    if (!canRaise || !this.canPayEnergy(player, parameter)) {
      return undefined;
    }
    const label = parameter === 'temperature' ? 'temperature' : 'oxygen';
    return new SelectOption(`Spend ${ENERGY_COST} energy to raise ${label} 1 step`, 'Spend energy')
      .andThen(() => this.payEnergyAndRaise(player, parameter));
  }

  private optionForMegacredits(player: IPlayer, parameter: 'temperature' | 'oxygen'): SelectOption | undefined {
    const canRaise = parameter === 'temperature' ? this.canRaiseTemperature(player) : this.canRaiseOxygen(player);
    if (!canRaise || !this.canPayMegacredits(player, parameter)) {
      return undefined;
    }
    const label = parameter === 'temperature' ? 'temperature' : 'oxygen';
    return new SelectOption(`Spend ${MEGACREDIT_COST} M€ to raise ${label} 1 step`, 'Spend M€')
      .andThen(() => this.payMegacreditsAndRaise(player, parameter));
  }

  public action(player: IPlayer) {
    const options = [
      this.optionForEnergy(player, 'temperature'),
      this.optionForEnergy(player, 'oxygen'),
      this.optionForMegacredits(player, 'temperature'),
      this.optionForMegacredits(player, 'oxygen'),
    ].filter((option): option is SelectOption => option !== undefined);

    if (options.length === 0) {
      return undefined;
    }
    if (options.length === 1) {
      return options[0];
    }
    return new OrOptions(...options);
  }
}
