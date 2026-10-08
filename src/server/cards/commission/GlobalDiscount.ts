import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

export class GlobalDiscount extends ActionCard implements IProjectCard {
  constructor() {
    super({
      name: CardName.GLOBAL_DISCOUNT,
      type: CardType.ACTIVE,
      tags: [Tag.EARTH],
      cost: 13,
      victoryPoints: {tag: Tag.EARTH, each: 1, per: 3},

      action: {
        or: {
          behaviors: [
            {
              title: 'Decrease steel production 1 step to gain 6 M€.',
              production: {steel: -1},
              stock: {megacredits: 6},
            },
            {
              title: 'Decrease heat production 1 step to gain 5 M€.',
              production: {heat: -1},
              stock: {megacredits: 5},
            },
          ],
        },
      },

      metadata: {
        cardNumber: 'XB74',
        renderData: CardRenderer.builder((b) => {
          b.action('Decrease steel production 1 step to gain 6 M€.', (eb) => {
            eb.production((pb) => pb.minus().steel(1, {size: Size.SMALL})).startAction.megacredits(6, {size: Size.SMALL});
          }).br;
          b.action('Decrease heat production 1 step to gain 5 M€.', (eb) => {
            eb.production((pb) => pb.minus().heat(1, {size: Size.SMALL})).startAction.megacredits(5, {size: Size.SMALL});
          }).br;
          b.vpText('1 VP per 3 Earth tags, including this card.');
        }),
      },
    });
  }
}
