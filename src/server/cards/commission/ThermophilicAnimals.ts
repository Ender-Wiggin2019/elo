import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {CardType} from '../../../common/cards/CardType';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';

export class ThermophilicAnimals extends ActionCard implements IProjectCard {
  constructor() {
    super({
      name: CardName.THERMOPHILIC_ANIMALS,
      type: CardType.ACTIVE,
      tags: [Tag.ANIMAL],
      cost: 8,
      resourceType: CardResource.ANIMAL,
      victoryPoints: {resourcesHere: {}, per: 2},
      requirements: {party: PartyName.KELVINISTS},

      action: {
        spend: {heat: 2},
        addResources: 1,
        stock: {megacredits: 5},
      },

      metadata: {
        cardNumber: 'XB66',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 2 heat to add 1 animal to this card and gain 5 M€.', (eb) => {
            eb.heat(2).startAction.resource(CardResource.ANIMAL).megacredits(5);
          }).br;
          b.vpText('1 VP per 2 animals on this card.');
        }),
        description: 'Requires that Kelvinists are ruling or that you have 2 delegates there.',
      },
    });
  }
}
