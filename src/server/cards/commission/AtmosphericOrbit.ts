import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {GlobalParameter} from '../../../common/GlobalParameter';
import {MAX_VENUS_SCALE} from '../../../common/constants';
import {Tag} from '../../../common/cards/Tag';
import {Size} from '../../../common/cards/render/Size';
import {IPlayer} from '../../IPlayer';
import {BuildColony} from '../../deferredActions/BuildColony';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {CorporationCard} from '../corporation/CorporationCard';
import {CardRenderer} from '../render/CardRenderer';

const ORBITAL_COST_FOR_VENUS = 4;

export class AtmosphericOrbit extends CorporationCard {
  constructor() {
    super({
      name: CardName.ATMOSPHERIC_ORBIT,
      tags: [Tag.VENUS, Tag.SCIENCE],
      startingMegaCredits: 43,
      resourceType: CardResource.ORBITAL,
      behavior: {stock: {heat: 5}},
      firstAction: {text: '摸1张牌。', drawCard: 1},
      metadata: {
        cardNumber: 'XB25',
        description: '你起始拥有43 M€和5热能。作为第一个行动，摸1张牌。',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(43).heat(5).cards(1);
          b.corpBox('effect', (ce) => {
            ce.vSpace();
            ce.effect(`每次摸牌（研究购牌除外）或升1格温度，三选一：加1轨道；花${ORBITAL_COST_FOR_VENUS}轨道升1格金星；花5轨道建1殖民地。`, (eb) => {
              eb.cards(1, {size: Size.SMALL}).slash().temperature(1, {size: Size.SMALL}).startEffect.resource(CardResource.ORBITAL).asterix();
            });
            ce.vSpace(Size.LARGE);
            ce.vSpace(Size.SMALL);
          });
        }),
      },
    });
  }

  public onCardsDrawn(player: IPlayer): void {
    player.defer(() => this.chooseEffect(player));
  }

  public onGlobalParameterIncrease(player: IPlayer, parameter: GlobalParameter, steps: number): void {
    if (parameter === GlobalParameter.TEMPERATURE) {
      for (let i = 0; i < steps; i++) {
        this.onCardsDrawn(player);
      }
    }
  }

  private chooseEffect(player: IPlayer) {
    const options = new OrOptions(new SelectOption('在大气轨道放置1个轨道').andThen(() => {
      player.addResourceTo(this, {log: true});
      return undefined;
    }));
    if (this.resourceCount >= ORBITAL_COST_FOR_VENUS && player.game.getVenusScaleLevel() < MAX_VENUS_SCALE &&
        player.canAfford({cost: 0, tr: {venus: 1}})) {
      options.options.push(new SelectOption(`移除${ORBITAL_COST_FOR_VENUS}个轨道，提升1格金星`).andThen(() => {
        player.removeResourceFrom(this, ORBITAL_COST_FOR_VENUS, {log: true});
        player.game.increaseVenusScaleLevel(player, 1);
        return undefined;
      }));
    }
    if (this.resourceCount >= 5 && player.colonies.getPlayableColonies().length > 0) {
      options.options.push(new SelectOption('移除5个轨道，放置1个殖民地').andThen(() => {
        player.game.defer(new BuildColony(player)).andThen(() => {
          player.removeResourceFrom(this, 5, {log: true});
        });
        return undefined;
      }));
    }
    return options.reduce();
  }
}
