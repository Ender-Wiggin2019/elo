import {IProjectCard} from '../IProjectCard';
import {ICard} from '../ICard';
import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';

export class ShadowCabinet extends Card implements IProjectCard {
  constructor() {
    super({
      name: CardName.SHADOW_CABINET,
      type: CardType.ACTIVE,
      tags: [Tag.EARTH],
      cost: 5,
      victoryPoints: -1,

      metadata: {
        cardNumber: 'XB70',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a card with negative VP, including this, gain 3 M€.', (eb) => {
            eb.minus().vpIcon().asterix().startEffect.megacredits(3);
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard): void {
    if (!player.playedCards.has(this.name)) {
      return;
    }
    if (card.name === CardName.SCIENCE_TAG_BLANK_CARD) {
      return;
    }
    const victoryPoints = card.metadata?.victoryPoints;
    if (victoryPoints === undefined) {
      return;
    }
    if (typeof victoryPoints === 'number') {
      if (victoryPoints >= 0) {
        return;
      }
    } else if (victoryPoints.points >= 0) {
      return;
    }

    player.stock.add(Resource.MEGACREDITS, 3, {log: true, from: {card: this}});
  }
}
