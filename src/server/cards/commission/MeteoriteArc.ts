import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';

export class MeteoriteArc extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.METEORITE_ARC,
      tags: [Tag.SPACE],
      cost: 17,

      behavior: {
        ocean: {},
        stock: {energy: 3},
      },

      metadata: {
        cardNumber: 'XB89',
        description: '打出时放置1个海洋并获得3电力资源。',
        renderData: CardRenderer.builder((b) => {
          b.oceans(1).energy(3);
        }),
      },
    });
  }
}
