import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Tag} from '../../../common/cards/Tag';
import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';


export class FloralBloomSurge extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.FLORAL_BLOOM_SURGE,
      tags: [Tag.PLANT],
      requirements: {tag: Tag.PLANT, count: 2},
      cost: 10,

      metadata: {
        cardNumber: 'XB54',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a plant tag card, gain 1 plant production.', (eb) => {
            eb.tag(Tag.PLANT).startEffect.production((pb) => {
              pb.plants(1);
            });
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: IProjectCard) {
    for (const tag of card.tags) {
      if (tag === Tag.PLANT) {
        player.production.add(Resource.PLANTS, 1);
      }
    }
  }
}

