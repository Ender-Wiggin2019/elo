import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {Resource} from '../../../common/Resource';
import {IPlayer} from '../../IPlayer';
import {Card} from '../Card';
import {ICard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';

export class GridOptimization extends Card implements IProjectCard {
  constructor() {
    super({
      name: CardName.GRID_OPTIMIZATION,
      type: CardType.ACTIVE,
      cost: 8,
      tags: [Tag.POWER],
      requirements: {tag: Tag.POWER, count: 2},
      metadata: {
        cardNumber: 'XB71',
        renderData: CardRenderer.builder((b) => {
          b.effect('每当你打出1张没有VP图标的卡牌（包括此卡），获得1 M€。', (eb) => {
            eb.cards(1).asterix().startEffect.megacredits(1);
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard): void {
    // Like Vitor, inspect the printed VP icon rather than the current score.
    if (card.name !== CardName.SCIENCE_TAG_BLANK_CARD && card.metadata.victoryPoints === undefined) {
      player.stock.add(Resource.MEGACREDITS, 1, {log: true, from: {card: this}});
    }
  }
}
