import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {Payment} from '../../../common/inputs/Payment';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectPayment} from '../../inputs/SelectPayment';
import {SelectOption} from '../../inputs/SelectOption';
import {ICard} from '../ICard';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {all} from '../Options';
import {CardRenderer} from '../render/CardRenderer';

const ANIMAL_PAYMENT = 3;

export class SpeciesPropagation extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SPECIES_PROPAGATION,
      tags: [Tag.ANIMAL],
      cost: 11,
      resourceType: CardResource.ANIMAL,
      victoryPoints: {resourcesHere: {}},
      requirements: {oxygen: 10},

      metadata: {
        cardNumber: 'XB84',
        renderData: CardRenderer.builder((b) => {
          b.effect('任意玩家打出动物或植物标签的卡（包括此卡）时，你可支付3 M€，在此卡上增加1个动物资源。', (eb) => {
            eb.tag(Tag.ANIMAL, {all}).slash().tag(Tag.PLANT, {all}).startEffect.megacredits(ANIMAL_PAYMENT).arrow().resource(CardResource.ANIMAL);
          }).br;
          b.vpText('此卡上的每个动物资源计1 VP。');
        }),
      },
    });
  }

  private logPayment(player: IPlayer, payment: Payment): void {
    const logResource = (amount: number, resource: string) => {
      if (amount > 0) {
        player.game.log('${0} lost ${1} ${2} because of ${3}', (b) =>
          b.player(player).number(amount).string(resource).from({card: this.name}));
      }
    };

    logResource(payment.megacredits, 'M€');
    logResource(payment.steel, 'steel');
    logResource(payment.titanium, 'titanium');
    logResource(payment.plants, payment.plants === 1 ? 'plant' : 'plants');
  }

  private logHeatPayment(player: IPlayer, heatBefore: number): void {
    const heatSpent = heatBefore - player.heat;
    if (heatSpent > 0) {
      player.game.log('${0} lost ${1} heat because of ${2}', (b) =>
        b.player(player).number(heatSpent).from({card: this.name}));
    }
  }

  private resolvePayment(player: IPlayer, payment: Payment): PlayerInput | undefined {
    const nonHeatPayment = Payment.of({...payment, heat: 0});
    player.pay(nonHeatPayment);

    const heatBefore = player.heat;
    const finish = () => {
      this.logPayment(player, nonHeatPayment);
      this.logHeatPayment(player, heatBefore);
      player.addResourceTo(this, {qty: 1, log: true, from: {card: this}});
      return undefined;
    };

    if (payment.heat === 0) {
      return finish();
    }
    return player.spendHeat(payment.heat, finish);
  }

  private payForAnimal(player: IPlayer): void {
    const canUseHeat = player.canUseHeatAsMegaCredits && player.availableHeat() > 0;
    const canUseTitanium = player.canUseTitaniumAsMegacredits && player.titanium > 0;
    if (!canUseHeat && !canUseTitanium) {
      this.resolvePayment(player, Payment.of({megacredits: ANIMAL_PAYMENT}));
      return;
    }

    player.defer(() => new SelectPayment(
      '选择支付3 M€的方式',
      ANIMAL_PAYMENT,
      {
        heat: player.canUseHeatAsMegaCredits,
        lunaTradeFederationTitanium: player.canUseTitaniumAsMegacredits,
      },
    ).andThen((payment) => this.resolvePayment(player, payment)));
  }

  public onCardPlayedByAnyPlayer(player: IPlayer, card: ICard, _activePlayer: IPlayer) {
    if (!card.tags.includes(Tag.ANIMAL) && !card.tags.includes(Tag.PLANT)) {
      return undefined;
    }

    if (!player.canAfford(ANIMAL_PAYMENT)) {
      return undefined;
    }

    const addAnimal = new SelectOption('支付3 M€，在此卡上增加1个动物资源', '增加动物').andThen(() => {
      this.payForAnimal(player);
      return undefined;
    });

    const skip = new SelectOption('跳过物种繁衍效果', '跳过').andThen(() => undefined);
    return new OrOptions(addAnimal, skip);
  }
}
