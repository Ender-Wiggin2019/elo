import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {SpaceName} from '../../../common/boards/SpaceName';
import * as DynamicVictoryPoints from '../render/DynamicVictoryPoints';

export class Trantor extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.TRANTOR,
      tags: [Tag.SPACE, Tag.CITY],
      cost: 10,
      victoryPoints: 'special',

      behavior: {
        production: {megacredits: 2},
        city: {space: SpaceName.TRANTOR},
      },

      metadata: {
        cardNumber: 'Q58',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(2)).br;
          b.city().asterix();
        }),
        description: 'Increase your M€ production 2 steps. Place a city tile IN SPACE, outside and separate from the planet. At the end of the game, if you have the most cities not on Mars (including ties), gain 3 VPs.',
        victoryPoints: DynamicVictoryPoints.trantor(),
      },
    });
  }

  public override getVictoryPoints(player: IPlayer) {
    const game = player.game;
    const myCount = game.board.getCitiesOffMars(player).length;
    const allCounts = game.players.map((p) => game.board.getCitiesOffMars(p).length);
    const maxCount = Math.max(...allCounts);
    return (myCount === maxCount && maxCount > 0) ? 3 : 0;
  }
}
