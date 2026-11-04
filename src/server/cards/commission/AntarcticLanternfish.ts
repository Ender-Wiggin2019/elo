import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Resource} from '../../../common/Resource';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {Board} from '../../boards/Board';
import {BoardType} from '../../boards/BoardType';
import {Space} from '../../boards/Space';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';
import {Size} from '../../../common/cards/render/Size';

/**
 * 电灯鱼
 *
 * This keeps the ocean requirement and ocean-triggered energy effect from the
 * original Meteorite Arc, but gains one energy instead of placing an ocean.
 */
export class AntarcticLanternfish extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ANTARCTIC_LANTERNFISH,
      tags: [Tag.ANIMAL, Tag.POWER],
      cost: 11,
      requirements: {oceans: 2},

      behavior: {
        stock: {energy: 1},
      },

      metadata: {
        cardNumber: 'XB91',
        description: '需要2个海洋。打出时获得1电力资源。每当任意玩家放置海洋时，你获得1电力资源。',
        renderData: CardRenderer.builder((b) => {
          b.energy(1).br;
          b.effect('每当任意玩家放置海洋时，你获得1电力资源。', (eb) => {
            eb.oceans(1, {all, size: Size.SMALL}).startEffect.energy(1);
          });
        }),
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, _activePlayer: IPlayer, space: Space, boardType: BoardType): void {
    if (boardType === BoardType.MARS && Board.isUncoveredOceanSpace(space)) {
      cardOwner.stock.add(Resource.ENERGY, 1, {log: true, from: {card: this}});
    }
  }
}
