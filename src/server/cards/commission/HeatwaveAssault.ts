import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Resource} from '../../../common/Resource';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';

const STEEL_REMOVAL = 2;

export class HeatwaveAssault extends Card implements IProjectCard {
  constructor() {
    super({
      name: CardName.HEATWAVE_ASSAULT,
      type: CardType.AUTOMATED,
      tags: [Tag.SPACE],
      cost: 11,
      requirements: {oceans: 6},
      victoryPoints: -1,

      behavior: {
        global: {temperature: 2},
      },

      metadata: {
        cardNumber: 'XB80',
        renderData: CardRenderer.builder((b) => {
          b.temperature(2).br;
          b.minus().steel(STEEL_REMOVAL);
        }),
        description: '需要6片海洋。提升2格温度，并移除你的2个钢铁资源。',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.steel >= STEEL_REMOVAL;
  }

  public override bespokePlay(player: IPlayer): undefined {
    // This is an ordinary resource loss, rather than a payment, so it must not
    // notify cards that trigger when steel or titanium is spent.
    player.stock.deduct(Resource.STEEL, STEEL_REMOVAL, {log: true, from: {card: this}});
    return undefined;
  }
}
