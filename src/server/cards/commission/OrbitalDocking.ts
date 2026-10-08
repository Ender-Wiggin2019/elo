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
      cost: 12,
      tags: [Tag.SCIENCE],
      requirements: {party: PartyName.SCIENTISTS},
      victoryPoints: 1,
      metadata: {
        cardNumber: 'XB68',
        renderData: CardRenderer.builder((b) => {
          b.effect('你获得殖民地奖励时，额外获得1次该奖励；同一殖民地板块有多个殖民地时，也只额外获得1次。', (eb) => {
            eb.colonies(1).startEffect.text('+1').asterix();
          });
        }),
      },
    });
  }
}
