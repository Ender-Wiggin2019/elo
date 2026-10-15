import {CardName} from '../../../common/cards/CardName';
import {Tag} from '../../../common/cards/Tag';
import {Size} from '../../../common/cards/render/Size';
import {Phase} from '../../../common/Phase';
import {Resource} from '../../../common/Resource';
import {IPlayer} from '../../IPlayer';
import {Board} from '../../boards/Board';
import {BoardType} from '../../boards/BoardType';
import {Space} from '../../boards/Space';
import {Priority} from '../../deferredActions/Priority';
import {SelectPaymentDeferred} from '../../deferredActions/SelectPaymentDeferred';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {CorporationCard} from '../corporation/CorporationCard';
import {CardRenderer} from '../render/CardRenderer';

const STARTING_MEGA_CREDITS = 40;
const OCEAN_BONUS_MEGA_CREDITS = 5;
const OCEAN_BONUS_TITANIUM = 2;

export class MeteoriteLakeside extends CorporationCard {
  constructor() {
    super({
      name: CardName.METEORITE_LAKESIDE,
      tags: [Tag.SPACE, Tag.EARTH],
      startingMegaCredits: STARTING_MEGA_CREDITS,
      firstAction: {text: '在非海洋保留区放置1个海洋。', ocean: {on: 'land'}},
      metadata: {
        cardNumber: 'XB26',
        description: `你起始拥有${STARTING_MEGA_CREDITS} M€。作为第一个行动，在非海洋保留区放置1个海洋。`,
        renderData: CardRenderer.builder((b) => {
          b.megacredits(STARTING_MEGA_CREDITS).oceans(1).asterix();
          b.corpBox('effect', (ce) => {
            ce.vSpace();
            ce.effect(`每当有任意海洋被放置时，可花${OCEAN_BONUS_MEGA_CREDITS} M€或${OCEAN_BONUS_TITANIUM}钛提升1 TR。`, (eb) => {
              eb.oceans(1, {all: true, size: Size.SMALL}).startEffect.tr(1, {size: Size.SMALL}).asterix();
            });
            ce.effect('你邻海放板块时，可花2 M€摸1张牌（每次放板块最多1次）。', (eb) => {
              eb.emptyTile('normal', {size: Size.SMALL}).asterix().megacredits(2, {size: Size.SMALL}).startEffect.cards(1, {size: Size.SMALL});
            });
          });
        }),
      },
    });
  }

  public onTilePlaced(owner: IPlayer, activePlayer: IPlayer, space: Space, boardType: BoardType): void {
    if (boardType !== BoardType.MARS) {
      return;
    }
    if (Board.isUncoveredOceanSpace(space)) {
      owner.defer(() => this.oceanBonus(owner));
    }
    if (owner.game.phase === Phase.SOLAR || owner.game.phase === Phase.INTERGENERATION) {
      return;
    }
    if (owner.id === activePlayer.id && space.tile !== undefined &&
        owner.game.board.getAdjacentSpaces(space).some(Board.isOceanSpace)) {
      owner.defer(() => {
        if (!owner.canAfford(2)) {
          return undefined;
        }
        return new OrOptions(
          new SelectOption('花费2 M€，摸1张牌').andThen(() => {
            owner.game.defer(new SelectPaymentDeferred(owner, 2), Priority.COST).andThen(() => owner.drawCard());
            return undefined;
          }),
          new SelectOption('跳过邻海摸牌').andThen(() => undefined),
        );
      });
    }
  }

  private oceanBonus(player: IPlayer) {
    const options = new OrOptions();
    if (player.canAfford({cost: OCEAN_BONUS_MEGA_CREDITS, tr: {tr: 1}})) {
      options.options.push(new SelectOption(`花费${OCEAN_BONUS_MEGA_CREDITS} M€，提升1 TR`).andThen(() => {
        player.game.defer(new SelectPaymentDeferred(player, OCEAN_BONUS_MEGA_CREDITS), Priority.COST)
          .andThen(() => player.increaseTerraformRating(1, {log: true, from: {card: this.name}}));
        return undefined;
      }));
    }
    if (player.titanium >= OCEAN_BONUS_TITANIUM && player.canAfford({cost: 0, tr: {tr: 1}})) {
      options.options.push(new SelectOption(`花费${OCEAN_BONUS_TITANIUM}钛，提升1 TR`).andThen(() => {
        player.stock.deduct(Resource.TITANIUM, OCEAN_BONUS_TITANIUM, {log: true});
        player.increaseTerraformRating(1, {log: true, from: {card: this.name}});
        return undefined;
      }));
    }
    if (options.options.length === 0) {
      return undefined;
    }
    options.options.push(new SelectOption('跳过星陨湖畔效果').andThen(() => undefined));
    return options;
  }
}
