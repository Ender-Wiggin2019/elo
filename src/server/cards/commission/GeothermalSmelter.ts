import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Tag} from '../../../common/cards/Tag';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';

export class GeothermalSmelter extends Card implements IProjectCard {
  constructor() {
    super({
      name: CardName.GEOTHERMAL_SMELTER,
      type: CardType.ACTIVE,
      cost: 7,
      tags: [Tag.BUILDING],
      requirements: {party: PartyName.MARS},

      behavior: {
        production: {heat: 1},
      },

      metadata: {
        cardNumber: 'XB77',
        description: 'Requires that Mars First is ruling or that you have 2 delegates there. Increase your heat production 1 step.',
        renderData: CardRenderer.builder((b) => {
          b.effect('When playing a building tag, heat may be used as 2 M€ each.',
            (eb) => eb.tag(Tag.BUILDING).startEffect.heat(1).equals().megacredits(2)).br;
          b.production((pb) => pb.heat(1));
        }),
      },
    });
  }
}
