import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {TRSource} from '../../../common/cards/TRSource';
import {IPlayer} from '../../IPlayer';
import {Units} from '../../../common/Units';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {IActionCard} from '../ICard';
import {PlayerInput} from '../../PlayerInput';
import {Phase} from '../../../common/Phase';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SelectPaymentDeferred} from '../../deferredActions/SelectPaymentDeferred';
import {PlaceOceanTile} from '../../deferredActions/PlaceOceanTile';
import {TITLES} from '../../inputs/titles';
import {Size} from '../../../common/cards/render/Size';

const MEGACREDIT_COST = 14;
const HEAT_COST = 9;

export class RedPlanetOceans extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      name: CardName.RED_PLANET_OCEANS,
      type: CardType.ACTIVE,
      tags: [Tag.SPACE],
      cost: 5,

      metadata: {
        cardNumber: 'XB75',
        renderData: CardRenderer.builder((b) => {
          b.effect('When the oceans are full, your attempted ocean placement gains 1 TR.', (eb) => {
            eb.oceans(1).text('(9)', Size.SMALL, true).startEffect.tr(1);
          }).br;
          b.action('Spend 14 M€ or 9 heat to place an ocean tile.', (eb) => {
            eb.megacredits(MEGACREDIT_COST).slash().heat(HEAT_COST).startAction.oceans(1);
          });
        }),
      },
    });
  }

  private trSource(player: IPlayer): TRSource {
    if (player.game.canAddOcean()) {
      return {oceans: 1};
    }
    if (player.game.phase === Phase.SOLAR || player.game.phase === Phase.INTERGENERATION) {
      return {};
    }
    return {tr: 1};
  }

  private canPayMegacredits(player: IPlayer): boolean {
    return player.canAfford({cost: MEGACREDIT_COST, tr: this.trSource(player)});
  }

  private canPayHeat(player: IPlayer): boolean {
    if (player.availableHeat() < HEAT_COST) {
      return false;
    }
    return player.canAfford({
      cost: 0,
      reserveUnits: Units.of({heat: HEAT_COST}),
      tr: this.trSource(player),
    });
  }

  public canAct(player: IPlayer): boolean {
    return this.canPayMegacredits(player) || this.canPayHeat(player);
  }

  private placeOceanWithMegacredits(player: IPlayer): undefined {
    player.game.defer(new SelectPaymentDeferred(player, MEGACREDIT_COST, {
      title: TITLES.payForCardAction(this.name),
    })).andThen(() => player.game.defer(new PlaceOceanTile(player)));
    return undefined;
  }

  private placeOceanWithHeat(player: IPlayer): PlayerInput | undefined {
    return player.spendHeat(HEAT_COST, () => {
      player.game.defer(new PlaceOceanTile(player));
      return undefined;
    });
  }

  public action(player: IPlayer): PlayerInput | undefined {
    const options: Array<SelectOption> = [];
    if (this.canPayMegacredits(player)) {
      options.push(new SelectOption('Spend 14 M€ to place an ocean tile', 'Spend M€')
        .andThen(() => this.placeOceanWithMegacredits(player)));
    }
    if (this.canPayHeat(player)) {
      options.push(new SelectOption('Spend 9 heat to place an ocean tile', 'Spend heat')
        .andThen(() => this.placeOceanWithHeat(player)));
    }

    if (options.length === 1) {
      return options[0].cb(undefined);
    }
    if (options.length === 0) {
      return undefined;
    }
    return new OrOptions(...options);
  }
}
