import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {Resource} from '../../../common/Resource';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../ICard';
import {CorporationCard} from '../corporation/CorporationCard';
import {CardRenderer} from '../render/CardRenderer';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SelectPayment} from '../../inputs/SelectPayment';
import {Priority} from '../../deferredActions/Priority';
import {SerializedCard} from '../../SerializedCard';
import {Payment} from '../../../common/inputs/Payment';
import {PlayerInput} from '../../PlayerInput';

const DRAW_COST = 3;
const TAG_THRESHOLD = 5;

/**
 * Omni Horizon tracks tags independently from the player's normal tag count.
 * In particular, event-card tags and wild tags are never part of either effect.
 */
export class OmniHorizon extends CorporationCard {
  constructor() {
    super({
      name: CardName.OMNI_HORIZON,
      startingMegaCredits: 47,

      metadata: {
        cardNumber: 'XB92',
        description: '你起始拥有47 M€。你在场上获得新的非事件标签时，获得3 M€。场上某种非万能标签每达到5的倍数时，可支付3 M€摸1张普通牌。',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(47);
          b.corpBox('effect', (ce) => {
            ce.effect('当你在场上获得一种新的标签（事件牌不计）时，获得3 M€。', (eb) => {
              eb.diverseTag().startEffect.megacredits(3);
            });
            ce.effect('场上某种非万能标签每达到5的倍数时，可支付3 M€摸1张普通牌。', (eb) => {
              eb.text('5').diverseTag().asterix().startEffect.megacredits(-3).cards(1);
            });
          });
        }),
      },
    });
  }

  /** Tags already in play when the corporation is acquired do not grant the new-tag bonus. */
  public allTags = new Set<Tag>();

  /** The last five-tag threshold handled for each tag. */
  public data: {counts: Partial<Record<Tag, number>>} = {
    counts: {},
  };

  private tagsForCard(card: ICard): Array<Tag> {
    if (card.type === CardType.EVENT) {
      return [];
    }
    return card.tags.filter((tag) => tag !== Tag.WILD && tag !== Tag.EVENT);
  }

  private tagCount(player: IPlayer, tag: Tag): number {
    // Use tableau tags directly so event-tag corporations cannot include events.
    let count = player.playedCards.tags[tag];
    if (tag === Tag.SCIENCE) {
      count += player.tags.extraScienceTags;
    } else if (tag === Tag.PLANT) {
      count += player.tags.extraPlantTags;
    } else if (tag === Tag.JOVIAN) {
      count += player.tags.extraJovianTags;
    }
    return count;
  }

  public override bespokePlay(player: IPlayer) {
    // Non-card tags (for example Underworld's extra Science/Plant tags and
    // Delta Project's extra Jovian tags) already in play also count as types
    // seen when this corporation is acquired.
    for (const tag of Object.values(Tag)) {
      if (tag === Tag.WILD || tag === Tag.EVENT) {
        continue;
      }
      if (this.tagCount(player, tag) > 0) {
        this.allTags.add(tag);
      }
    }
    return undefined;
  }

  public onCardPlayed(player: IPlayer, card: ICard): void {
    if (!player.playedCards.has(this.name)) {
      return;
    }
    this.processTags(player, this.tagsForCard(card));
  }

  public onNonCardTagAdded(player: IPlayer, tag: Tag): void {
    this.processTags(player, [tag]);
  }

  private processTags(player: IPlayer, tags: ReadonlyArray<Tag>): void {
    const rewards: Array<Tag> = [];

    for (const tag of tags) {
      if (tag === Tag.WILD || tag === Tag.EVENT) {
        continue;
      }

      if (!this.allTags.has(tag)) {
        this.allTags.add(tag);
        player.stock.add(Resource.MEGACREDITS, 3, {log: true, from: {card: this}});
      }

      const count = this.tagCount(player, tag);
      const tagsFromCurrentCard = tags.filter((currentTag) => currentTag === tag).length;
      const priorCount = count - tagsFromCurrentCard;
      const lastReward = this.data.counts[tag] ?? Math.floor(priorCount / TAG_THRESHOLD) * TAG_THRESHOLD;
      this.data.counts[tag] = lastReward;

      const newRewardThreshold = lastReward + TAG_THRESHOLD;
      if (count >= newRewardThreshold) {
        this.data.counts[tag] = newRewardThreshold;
        rewards.push(tag);
      }
    }

    player.defer(() => this.effectOptions(player, rewards), Priority.BEFORE_PHARMACY_UNION);
  }

  private effectOptions(player: IPlayer, tags: Array<Tag>): OrOptions | undefined {
    const tag = tags.shift();
    if (tag === undefined) {
      return undefined;
    }

    if (!player.canAfford(DRAW_COST)) {
      player.game.log('${0} cannot afford to use ${1} to draw a card', (b) => b.player(player).card(this));
      return undefined;
    }

    return new OrOptions(
      new SelectOption('支付3 M€摸1张普通牌', '摸牌').andThen(() => {
        this.payForDraw(player, tags);
        return undefined;
      }),
      new SelectOption('跳过', '跳过').andThen(() => {
        player.defer(() => this.effectOptions(player, tags), Priority.BEFORE_PHARMACY_UNION);
        return undefined;
      }),
    );
  }

  private payForDraw(player: IPlayer, tags: Array<Tag>): void {
    const canUseHeat = player.canUseHeatAsMegaCredits && player.availableHeat() > 0;
    const canUseTitanium = player.canUseTitaniumAsMegacredits && player.titanium > 0;
    if (!canUseHeat && !canUseTitanium) {
      this.resolvePayment(player, Payment.of({megacredits: DRAW_COST}), tags);
      return;
    }

    player.defer(() => new SelectPayment(
      '选择支付3 M€的方式',
      DRAW_COST,
      {
        heat: player.canUseHeatAsMegaCredits,
        lunaTradeFederationTitanium: player.canUseTitaniumAsMegacredits,
      },
    ).andThen((payment) => this.resolvePayment(player, payment, tags)), Priority.BEFORE_PHARMACY_UNION);
  }

  private resolvePayment(player: IPlayer, payment: Payment, tags: Array<Tag>): PlayerInput | undefined {
    const nonHeatPayment = Payment.of({...payment, heat: 0});
    player.pay(nonHeatPayment);

    const heatBefore = player.heat;
    const finish = () => {
      this.logPayment(player, nonHeatPayment);
      this.logHeatPayment(player, heatBefore);
      player.drawCard(1);
      player.defer(() => this.effectOptions(player, tags), Priority.BEFORE_PHARMACY_UNION);
      return undefined;
    };

    if (payment.heat === 0) {
      return finish();
    }
    return player.spendHeat(payment.heat, finish);
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

  public serialize(serialized: SerializedCard): void {
    serialized.allTags = Array.from(this.allTags);
  }

  public deserialize(serialized: SerializedCard): void {
    this.allTags = new Set(serialized.allTags ?? []);
    if (this.data === undefined || this.data.counts === undefined) {
      this.data = {counts: {}};
    }
  }
}
