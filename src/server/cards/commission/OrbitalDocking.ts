import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';

export class OrbitalDocking extends Card implements IProjectCard {
  constructor() {
    super({
      name: CardName.ORBITAL_DOCKING,
      type: CardType.ACTIVE,
      cost: 16,
      tags: [Tag.SCIENCE],
      requirements: {party: PartyName.SCIENTISTS},
      victoryPoints: 1,
      metadata: {
        cardNumber: 'XB68',
        description: 'Requires that Scientists are ruling or that you have 2 delegates there.',
        renderData: CardRenderer.builder((b) => {
          b.effect('你获得殖民地贸易奖励时，额外获得1次该奖励；同一殖民地板块有多个殖民地时，也只额外获得1次。', (eb) => {
            eb.trade().startEffect.text('+1').asterix();
          });
        }),
      },
    });
  }
}
