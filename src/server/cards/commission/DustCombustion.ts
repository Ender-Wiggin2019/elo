import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardRenderer} from '../render/CardRenderer';
import {IProjectCard} from '../IProjectCard';

export class DustCombustion extends Card implements IProjectCard {
  constructor() {
    super({
      name: CardName.DUST_COMBUSTION,
      type: CardType.AUTOMATED,
      tags: [Tag.VENUS, Tag.SPACE],
      cost: 9,
      requirements: {oxygen: 8},
      victoryPoints: -1,

      // The oxygen decrease does not remove TR, so keep the positive TR source
      // explicit for Reds' ruling policy cost calculation.
      tr: {temperature: 2},
      behavior: {
        spend: {resourceFromAnyCard: {type: CardResource.FLOATER}},
        global: {oxygen: -1, temperature: 2},
      },

      metadata: {
        cardNumber: 'XB64',
        renderData: CardRenderer.builder((b) => {
          b.minus().resource(CardResource.FLOATER).br;
          b.minus().oxygen(1).temperature(2);
        }),
        description: 'Requires 8% oxygen. Spend 1 floater from one of your cards. Decrease oxygen 1 step and increase temperature 2 steps.',
      },
    });
  }
}
