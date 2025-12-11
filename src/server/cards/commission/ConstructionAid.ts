import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../ICard';

/**
 * 蓝卡，建材援助
1铁标
卡牌费用：12MC
初始效果：1VP
效果：当你打出带有建筑标志的牌时，你可以少支付2M€
 */
export class ConstructionAid extends Card implements IProjectCard {
  constructor() {
    super({
      name: CardName.CONSTRUCTION_AID,
      type: CardType.ACTIVE,
      tags: [Tag.BUILDING],
      cost: 12,
      victoryPoints: 1,

      metadata: {
        cardNumber: 'XB59',
        renderData: CardRenderer.builder((b) => {
          b.effect('当你打出带有建筑标志的牌时，你可以少支付2M€', (eb) => {
            eb.tag(Tag.BUILDING).startEffect.megacredits(-2);
          });
        }),
      },
    });
  }

  public override getCardDiscount(_player: IPlayer, card: ICard): number {
    if (card.tags.includes(Tag.BUILDING)) {
      return 2;
    }
    return 0;
  }
}
