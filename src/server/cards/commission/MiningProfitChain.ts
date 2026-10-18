import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {Resource} from '../../../common/Resource';
import {Units} from '../../../common/Units';
import {IPlayer} from '../../IPlayer';
import {Priority} from '../../deferredActions/Priority';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';

export class MiningProfitChain extends Card implements IProjectCard {
  constructor() {
    super({
      name: CardName.MINING_PROFIT_CHAIN,
      type: CardType.ACTIVE,
      cost: 9,
      tags: [Tag.BUILDING],
      requirements: {tag: Tag.BUILDING, count: 2},
      victoryPoints: 1,

      metadata: {
        cardNumber: 'XB79',
        description: '需要2个建筑标记。',
        renderData: CardRenderer.builder((b) => {
          b.effect('每次花费钢铁或钛时，获得1 M€（每次支付只触发1次，不按资源数量计算）。', (eb) => {
            eb.minus().steel(1).slash().titanium(1).startEffect.megacredits(1);
          });
        }),
      },
    });
  }

  public onResourcesSpent(player: IPlayer, spent: Readonly<Units>): void {
    if (spent.steel > 0 || spent.titanium > 0) {
      player.defer(() => player.stock.add(Resource.MEGACREDITS, 1, {log: true, from: {card: this}}),
        Priority.GAIN_RESOURCE_OR_PRODUCTION);
    }
  }
}
