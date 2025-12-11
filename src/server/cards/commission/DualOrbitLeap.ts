import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Tag} from '../../../common/cards/Tag';
import {CorporationCard} from '../corporation/CorporationCard';
import {Size} from '../../../common/cards/render/Size';
import {IPlayer} from '../../IPlayer';
import {ColoniesHandler} from '../../colonies/ColoniesHandler';

export class DualOrbitLeap extends CorporationCard {
  constructor() {
    super({
      name: CardName.DUAL_ORBIT_LEAP,
      tags: [Tag.SPACE],
      startingMegaCredits: 52,
      initialActionText: 'Add a colony tile',

      behavior: {
        colonies: {
          tradeOffset: 2,
        },
      },

      metadata: {
        cardNumber: 'XB24',
        description: 'You start with 52 M€. As your first action, put an additional Colony Tile of your choice into play',
        renderData: CardRenderer.builder((b) => {
          b.br.br;
          b.megacredits(52).nbsp.colonyTile();
          b.corpBox('effect', (ce) => {
            ce.effect('When you trade, you may first increase that Colony Tile track 2 step.', (eb) => {
              eb.trade().startEffect.text('+2', Size.LARGE);
            });
          });
        }),
      },
    });
  }

  public override initialAction(player: IPlayer) {
    ColoniesHandler.addColonyTile(
      player,
      // {title: 'Select colony tile to add', filterTile: [ColonyName.PLUTO, ColonyName.DEIMOS]},
      {title: 'Select colony tile to add'},
    );
    return undefined;
  }
}

