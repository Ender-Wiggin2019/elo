import {Player} from '../../Player';
import {ISpace} from '../../boards/ISpace';
import {CardRenderer} from '../render/CardRenderer';
import {Board} from '../../boards/Board';
import {GainResources} from '../../deferredActions/GainResources';
import {Card} from '../Card';
import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Size} from '../../../common/cards/render/Size';
import {Tag} from '../../../common/cards/Tag';
import {Resource} from '../../../common/Resource';
import {ICorporationCard} from '../corporation/ICorporationCard';
import {digit, all} from '../../cards/Options';

export class CityGreenhouse extends Card implements ICorporationCard {
  constructor() {
    super({
      type: CardType.CORPORATION,
      name: CardName.CITY_GREENHOUSE,
      tags: [Tag.BUILDING],
      startingMegaCredits: 49,

      metadata: {
        cardNumber: 'XB11',
        description: 'You start 49 M€.',
        renderData: CardRenderer.builder((b) => {
          b.br.br.br.br;
          b.megacredits(49);
          b.corpBox('effect', (ce) => {
            ce.effect('When any city tile is placed, gain 6 heat.', (eb) => {
              eb.city({size: Size.MEDIUM, all}).startEffect.heat(6, {digit});
            });
          });
        }),
      },
    });
  }


  public onTilePlaced(cardOwner: Player, activePlayer: Player, space: ISpace) {
    if (Board.isCitySpace(space)) {
      cardOwner.game.defer(new GainResources(cardOwner, Resource.HEAT, {count: 6}));
      cardOwner.game.log('${0} received 4 Heat from ${1} city', (b) =>
        b.player(cardOwner)
          .player(activePlayer),
      );
    }
    return;
  }

  public override bespokePlay(player: Player) {
    if (player.game.getPlayers().length === 1) {
      // Get bonus for 2 neutral cities
      player.addResource(Resource.HEAT, 8);
    }
    return undefined;
  }
}
