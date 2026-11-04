import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';

export class GalileoMatrix extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.GALILEO_MATRIX,
      tags: [Tag.JOVIAN, Tag.SPACE],
      cost: 12,

      behavior: {
        // The object form makes the TR gain appear in the game log.
        tr: {start: 1},
      },

      cardDiscount: {tag: Tag.JOVIAN, amount: 2},
      metadata: {
        cardNumber: 'XB95',
        description: '打出时提升1点TR。你打出的牌上每有一个木星标签，其费用减少2 M€。',
        renderData: CardRenderer.builder((b) => {
          b.effect('你打出的牌上每有一个木星标签，其费用减少2 M€。', (eb) => {
            eb.tag(Tag.JOVIAN).startEffect.megacredits(-2);
          }).br;
          b.tr(1);
        }),
      },
    });
  }
}
