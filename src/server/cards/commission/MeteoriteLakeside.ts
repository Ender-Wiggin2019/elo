import {CardName} from '../../../common/cards/CardName';
import {Tag} from '../../../common/cards/Tag';
import {Size} from '../../../common/cards/render/Size';
import {Phase} from '../../../common/Phase';
import {Resource} from '../../../common/Resource';
import {REDS_RULING_POLICY_COST} from '../../../common/constants';
import {Payment} from '../../../common/inputs/Payment';
import {findRedsPaymentReserve} from '../../../common/inputs/RedsPayment';
import {Units} from '../../../common/Units';
import {IPlayer} from '../../IPlayer';
import {Board} from '../../boards/Board';
import {BoardType} from '../../boards/BoardType';
import {Space} from '../../boards/Space';
import {Priority} from '../../deferredActions/Priority';
import {SelectPaymentDeferred} from '../../deferredActions/SelectPaymentDeferred';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SelectPayment} from '../../inputs/SelectPayment';
import {InputError} from '../../inputs/InputError';
import {TurmoilHandler} from '../../turmoil/TurmoilHandler';
import {CorporationCard} from '../corporation/CorporationCard';
import {CardRenderer} from '../render/CardRenderer';

const STARTING_MEGA_CREDITS = 45;
const OCEAN_BONUS_MEGA_CREDITS = 5;

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
            ce.effect(`每当有任意海洋被放置时，可花${OCEAN_BONUS_MEGA_CREDITS} M€提升1 TR（可用钢铁支付）。`, (eb) => {
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
    const reserve = this.redsReserve(player);
    if (reserve === undefined || !player.canAfford({cost: OCEAN_BONUS_MEGA_CREDITS, steel: true, reserveUnits: reserve})) {
      return undefined;
    }

    return new OrOptions(
      new SelectPayment(`花费${OCEAN_BONUS_MEGA_CREDITS} M€（可用钢铁支付），提升1 TR`, OCEAN_BONUS_MEGA_CREDITS, {steel: true}, reserve)
        .andThen((payment) => this.payOceanBonus(player, payment, reserve)),
      new SelectOption('跳过星陨湖畔效果').andThen(() => undefined),
    );
  }

  private redsReserve(player: IPlayer): Units | undefined {
    const redsCost = TurmoilHandler.computeTerraformRatingBump(player, {tr: 1}) * REDS_RULING_POLICY_COST;
    // With no real heat, Stormcraft can only pay in indivisible two-heat units.
    const heatUnit = player.heat === 0 ? 2 : 1;
    const rates = {
      megacredits: 1,
      heat: player.canUseHeatAsMegaCredits ? heatUnit : 0,
      titanium: player.canUseTitaniumAsMegacredits ? Math.max(player.getTitaniumValue() - 1, 0) : 0,
    };
    const reserve = findRedsPaymentReserve({
      redsCost,
      available: {megacredits: player.megaCredits, heat: player.availableHeat() / heatUnit, titanium: player.titanium},
      redsRates: rates,
      cardRates: rates,
    });
    return reserve === undefined ? undefined : Units.of({...reserve.units, heat: reserve.units.heat * heatUnit});
  }

  private payOceanBonus(player: IPlayer, payment: Payment, reserve: Units) {
    if (!player.canSpend(payment, reserve) || player.payingAmount(payment, {steel: true}) < OCEAN_BONUS_MEGA_CREDITS) {
      throw new InputError('无法支付星陨湖畔费用或需要保留红党附加费用');
    }
    player.pay(Payment.of({...payment, heat: 0}));
    const heatBefore = player.heat;
    const finish = () => {
      for (const resource of [Resource.MEGACREDITS, Resource.STEEL, Resource.TITANIUM] as const) {
        if (payment[resource] > 0) {
          player.game.log('${0} lost ${1} ${2} because of ${3}', (b) => b.player(player).number(payment[resource])
            .string(resource === Resource.MEGACREDITS ? 'M€' : resource).from({card: this.name}));
        }
      }
      const heatSpent = heatBefore - player.heat;
      if (heatSpent > 0) {
        player.game.log('${0} lost ${1} heat because of ${2}', (b) => b.player(player).number(heatSpent).from({card: this.name}));
      }
      player.increaseTerraformRating(1, {log: true, from: {card: this.name}});
      return undefined;
    };
    return payment.heat > 0 ? player.spendHeat(payment.heat, finish, reserve.heat) : finish();
  }
}
