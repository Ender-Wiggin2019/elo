import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Tag} from '../../../common/cards/Tag';
import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';


export class UniversalResourceConverter extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.UNIVERSAL_RESOURCE_CONVERTER,
      tags: [Tag.MARS],
      cost: 5,
      requirements: {oceans: 1},
      resourceType: CardResource.WARE,
      victoryPoints: {resourcesHere: {}, per: 3},

      metadata: {
        cardNumber: 'XB55',
        renderData: CardRenderer.builder((b) => {
          b.effect('This card can receive any resource that can be placed on ANY card. Resources placed here get converted to wares resources.',
            (ab) => ab.wild(1).asterix().startEffect.resource(CardResource.WARE)).br;
          b.vpText('1 VP per 3 resource on this card.');
        }),
      },
    });
  }
}

