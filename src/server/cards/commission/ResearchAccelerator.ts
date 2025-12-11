import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';

export class ResearchAccelerator extends Card implements IProjectCard {
  constructor() {
    super({
      name: CardName.RESEARCH_ACCELERATOR,
      type: CardType.AUTOMATED,
      tags: [Tag.WILD, Tag.WILD], //
      cost: 11,

      requirements: {tag: Tag.SCIENCE, count: 3},
      metadata: {
        cardNumber: 'XB58',
        description: 'Requires 3 science tags. Gain 2 wild tags.',
      },
    });
  }
}
