import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Resource} from '../../../common/Resource';
import {CanAffordOptions, IPlayer} from '../../IPlayer';
import {Payment} from '../../../common/inputs/Payment';
import {SelectCard} from '../../inputs/SelectCard';
import {SelectOption} from '../../inputs/SelectOption';
import {OrOptions} from '../../inputs/OrOptions';
import {message} from '../../logs/MessageBuilder';
import {LogHelper} from '../../LogHelper';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';
import {digit} from '../Options';
import {ICard} from '../ICard';

const HEAT_COST = 5;
const TITANIUM_GAIN = 3;
const ASTEROID_GAIN = 2;

export class StarlightAlchemyTitanium extends Card implements IProjectCard {
  constructor() {
    super({
      name: CardName.STARLIGHT_ALCHEMY_TITANIUM,
      type: CardType.EVENT,
      tags: [],
      cost: 1,

      // Reserve this heat from the normal card-payment flow. The custom play
      // below spends it through spendHeat so Stormcraft can be selected.
      reserveUnits: {heat: HEAT_COST},

      metadata: {
        cardNumber: 'XB81',
        renderData: CardRenderer.builder((b) => {
          b.minus().heat(HEAT_COST, {digit});
          b.plus().titanium(TITANIUM_GAIN, {digit});
          b.or().resource(CardResource.ASTEROID, {amount: ASTEROID_GAIN, digit}).asterix();
        }),
        description: '消耗5热量，获得3钛，或在你的另一张卡牌上增加2个陨石资源。',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer, canAffordOptions: CanAffordOptions): boolean {
    const cardCost = player.getCardCost(this);
    let heat = player.heat;
    const stormcraft = player.playedCards.get(CardName.STORMCRAFT_INCORPORATED) ||
      player.playedCards.get(CardName._STORMCRAFT_INCORPORATED_);
    let floaters = stormcraft?.resourceCount ?? 0;

    // The engine checks reserveUnits before this hook, but its generic
    // affordability calculation treats a floater's 2 heat as fractional heat.
    // First account for every non-heat payment method that the engine enabled;
    // only the remaining shortfall can consume heat or a floater.
    const nonHeatPayment = Payment.of({
      megacredits: Math.max(player.megaCredits, 0),
      steel: player.steel,
      titanium: player.titanium,
      plants: player.plants,
      microbes: player.getSpendable('microbes'),
      floaters: player.getSpendable('floaters'),
      lunaArchivesScience: player.getSpendable('lunaArchivesScience'),
      spireScience: player.getSpendable('spireScience'),
      seeds: player.getSpendable('seeds'),
      auroraiData: player.getSpendable('auroraiData'),
      graphene: player.getSpendable('graphene'),
      kuiperAsteroids: player.getSpendable('kuiperAsteroids'),
      diseases: player.getSpendable('diseases'),
    });
    const nonHeatPaymentOptions = {...canAffordOptions, heat: false};

    if (player.payingAmount(nonHeatPayment, nonHeatPaymentOptions) < cardCost) {
      if (!player.canUseHeatAsMegaCredits) {
        return false;
      }
      if (heat > 0) {
        heat--;
      } else if (floaters > 0) {
        floaters--;
      } else {
        return false;
      }
    }

    return heat + (floaters * 2) >= HEAT_COST;
  }

  // Card.play would deduct reserveUnits directly, bypassing Stormcraft's
  // heat/floater selection. Spend the heat explicitly instead.
  public override play(player: IPlayer) {
    const asteroidCards: Array<ICard> = player.getResourceCards(CardResource.ASTEROID)
      .filter((card) => card !== this);
    const availableActions = new OrOptions();

    availableActions.options.push(new SelectOption('获得3钛', '获得钛').andThen(() => {
      player.stock.add(Resource.TITANIUM, TITANIUM_GAIN, {log: true, from: {card: this}});
      return undefined;
    }));

    if (asteroidCards.length === 1) {
      const targetCard = asteroidCards[0];
      availableActions.options.push(new SelectOption(
        message('在${1}上增加${0}个陨石资源', (b) => b.number(ASTEROID_GAIN).card(targetCard)),
        '增加陨石',
      ).andThen(() => {
        player.addResourceTo(targetCard, {qty: ASTEROID_GAIN, log: true, from: {card: this}});
        return undefined;
      }));
    } else if (asteroidCards.length > 1) {
      availableActions.options.push(new SelectCard(
        '选择一张卡牌增加2个陨石资源',
        '增加陨石',
        asteroidCards,
      ).andThen(([targetCard]) => {
        player.addResourceTo(targetCard, {qty: ASTEROID_GAIN, log: true, from: {card: this}});
        return undefined;
      }));
    }

    const startHeatPayment = () => {
      const stormcraft = player.playedCards.get(CardName.STORMCRAFT_INCORPORATED) ||
        player.playedCards.get(CardName._STORMCRAFT_INCORPORATED_);
      const heatBefore = player.heat;
      const floatersBefore = stormcraft?.resourceCount ?? 0;

      const logHeatSpent = () => {
        const heatSpent = heatBefore - player.heat;
        if (heatSpent > 0) {
          player.game.log('${0} lost ${1} heat because of ${2}', (b) =>
            b.player(player).number(heatSpent).from({card: this.name}));
        }

        const floatersSpent = floatersBefore - (stormcraft?.resourceCount ?? 0);
        if (floatersSpent > 0 && stormcraft !== undefined) {
          LogHelper.logRemoveResource(player, stormcraft, floatersSpent, `spend ${HEAT_COST} heat for ${this.name}`);
        }
      };

      const heatPayment = player.spendHeat(HEAT_COST, () => {
        logHeatSpent();
        if (availableActions.options.length === 1) {
          return availableActions.options[0].cb(undefined);
        }
        return availableActions;
      });

      return heatPayment;
    };

    // Player.pay can leave a Stormcraft input in the queue before it invokes
    // this card's play method. Defer creation of the effect payment so its
    // available heat and logging snapshot are taken after that card payment.
    const stormcraft = player.playedCards.get(CardName.STORMCRAFT_INCORPORATED) ||
      player.playedCards.get(CardName._STORMCRAFT_INCORPORATED_);
    if (stormcraft?.resourceCount && player.game.deferredActions.length > 0) {
      player.defer(startHeatPayment);
      return undefined;
    }

    return startHeatPayment();
  }
}
