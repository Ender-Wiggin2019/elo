import {CardName} from '../../../common/cards/CardName';
import {SpaceBonus} from '../../../common/boards/SpaceBonus';
import {Tag} from '../../../common/cards/Tag';
import {TileType} from '../../../common/TileType';
import {CardRenderer} from '../render/CardRenderer';
import {CorporationCard} from '../corporation/CorporationCard';

export class GeomagneticSymbiosis extends CorporationCard {
  constructor() {
    super({
      name: CardName.GEOMAGNETIC_SYMBIOSIS,
      tags: [Tag.BUILDING],
      startingMegaCredits: 45,
      behavior: {drawCard: 3},

      firstAction: {
        text: '放置 1 个地磁商业区板块。',
        tile: {
          type: TileType.COMMERCIAL_DISTRICT,
          on: 'land',
          adjacencyBonus: {bonus: [SpaceBonus.MEGACREDITS, SpaceBonus.MEGACREDITS]},
        },
      },

      metadata: {
        cardNumber: 'XB98',
        description: '你起始拥有 45 M€ 和 3 张牌。首行动放置 1 个地磁商业区板块。你的板块每次提供相邻奖励时，获得 1 钢铁。',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(45).nbsp.cards(3).nbsp.tile(TileType.COMMERCIAL_DISTRICT, false, true).br;
          b.effect('当你的板块提供一次相邻奖励时，获得 1 钢铁。', (eb) => {
            eb.emptyTile().emptyTile('golden').startEffect.steel(1);
          });
        }),
      },
    });
  }
}
