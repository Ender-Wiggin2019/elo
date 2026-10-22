import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {Resource} from '../../../common/Resource';
import {IPlayer} from '../../IPlayer';
import {Board} from '../../boards/Board';
import {BoardType} from '../../boards/BoardType';
import {Space} from '../../boards/Space';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';
import {Size} from '../../../common/cards/render/Size';

export class MeteoriteArc extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.METEORITE_ARC,
      tags: [Tag.SPACE, Tag.POWER],
      cost: 19,
      requirements: {oceans: 2},

      behavior: {
        ocean: {},
      },

      metadata: {
        cardNumber: 'XB89',
        description: '需要2个海洋。打出时放置1个海洋。每当任意玩家放置海洋时，你获得1电力资源。',
        renderData: CardRenderer.builder((b) => {
          b.oceans(1).asterix();
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
