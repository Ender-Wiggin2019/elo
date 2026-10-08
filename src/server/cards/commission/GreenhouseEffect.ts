import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {Resource} from '../../../common/Resource';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {Board} from '../../boards/Board';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';

export class GreenhouseEffect extends Card implements IProjectCard {
  constructor() {
    super({
      name: CardName.GREENHOUSE_EFFECT,
      type: CardType.ACTIVE,
      tags: [Tag.BUILDING],
      cost: 7,

      metadata: {
        cardNumber: 'XB69',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you place a city tile, gain 4 heat.', (eb) => {
            eb.city().startEffect.heat(4);
          });
        }),
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space) {
    if (cardOwner.id === activePlayer.id && Board.isCitySpace(space)) {
      cardOwner.stock.add(Resource.HEAT, 4, {log: true, from: {card: this}});
    }
  }
}
