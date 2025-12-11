import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Tag} from '../../../common/cards/Tag';
import {Resource} from '../../../common/Resource';
import {Board} from '../../boards/Board';
import {Space} from '../../boards/Space';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {CardType} from '../../../common/cards/CardType';


export class CityPowerShift extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.CITY_POWER_SHIFT,
      tags: [Tag.POWER, Tag.CITY, Tag.BUILDING],
      cost: 25,

      behavior: {
        city: {},
      },

      metadata: {
        cardNumber: 'XB55',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you place a city tile, increase your Power production 1 step.', (eb) => {
            eb.city().startEffect.production((pb) => pb.energy(1));
          }).br;
          b.city().vpText('place a city tile.');
        }),
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space) {
    if (Board.isCitySpace(space)) {
      if (cardOwner.id === activePlayer.id) {
        cardOwner.production.add(Resource.ENERGY, 1);
      }
    }
    return;
  }
}

