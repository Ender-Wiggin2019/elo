import {CardName} from '../../../common/cards/CardName';
import {Tag} from '../../../common/cards/Tag';
import {Phase} from '../../../common/Phase';
import {Resource} from '../../../common/Resource';
import {TileType} from '../../../common/TileType';
import {SpaceType} from '../../../common/boards/SpaceType';
import {IPlayer} from '../../IPlayer';
import {BoardType} from '../../boards/BoardType';
import {Space} from '../../boards/Space';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SelectPayment} from '../../inputs/SelectPayment';
import {CorporationCard} from '../corporation/CorporationCard';
import {CardRenderer} from '../render/CardRenderer';

const STARTING_MEGACREDITS = 42;
const ENERGY_COST = 5;

export class GeoPulseEnergy extends CorporationCard {
  constructor() {
    super({
      name: CardName.GEOPULSE_ENERGY,
      tags: [Tag.BUILDING, Tag.POWER],
      startingMegaCredits: STARTING_MEGACREDITS,
      firstAction: {
        text: '放置1个自然保护区板块，不受相邻板块限制。',
        tile: {type: TileType.NATURAL_PRESERVE, on: 'land'},
      },
      metadata: {
        cardNumber: 'XB99',
        description: `你起始拥有${STARTING_MEGACREDITS} M€。作为你的第1个行动，在任意可用陆地区域放置1个自然保护区板块。`,
        renderData: CardRenderer.builder((b) => {
          b.megacredits(STARTING_MEGACREDITS).nbsp.tile(TileType.NATURAL_PRESERVE, true);
          b.corpBox('effect', (ce) => {
            ce.effect(`你在火星上放置板块时，可以花费${ENERGY_COST} M€（可用钢铁支付），提升1级电力产能并获得1个电力资源。`, (eb) => {
              eb.emptyTile().startEffect.megacredits(-ENERGY_COST).super((sb) => sb.steel(1))
                .production((pb) => pb.energy(1)).energy(1);
            });
          });
        }),
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space, boardType: BoardType): void {
    if (cardOwner !== activePlayer || cardOwner.game.phase === Phase.SOLAR ||
        boardType !== BoardType.MARS || space.spaceType === SpaceType.COLONY) {
      return;
    }

    cardOwner.defer(() => {
      if (!cardOwner.canAfford({cost: ENERGY_COST, steel: true})) {
        return undefined;
      }
      return new OrOptions(
        new SelectPayment('花费5 M€（可用钢铁支付），提升1级电力产能并获得1个电力资源', ENERGY_COST, {steel: true})
          .andThen((payment) => {
            cardOwner.pay(payment);
            cardOwner.game.log('${0} paid ${1} M€ to use ${2}', (b) => b.player(cardOwner).number(ENERGY_COST).card(this));
            cardOwner.production.add(Resource.ENERGY, 1, {log: true, from: {card: this}});
            cardOwner.stock.add(Resource.ENERGY, 1, {log: true, from: {card: this}});
            return undefined;
          }),
        new SelectOption('Do not use card effect').andThen(() => {
          cardOwner.game.log('${0} declined to use the ${1} effect', (b) => b.player(cardOwner).card(this));
          return undefined;
        }),
      );
    });
  }
}
