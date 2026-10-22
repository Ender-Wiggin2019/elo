import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {IActionCard, ICard} from '../ICard';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';

export class BiotechBlueprintInnovation extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.BIOTECH_BLUEPRINT_INNOVATION,
      tags: [Tag.SCIENCE, Tag.MICROBE],
      cost: 12,
      resourceType: CardResource.MICROBE,
      requirements: {tag: Tag.SCIENCE, count: 3},
      victoryPoints: 1,

      metadata: {
        cardNumber: 'XB83',
        renderData: CardRenderer.builder((b) => {
          b.effect('每打出1个科学标签（含本牌），在本牌增加1个微生物。', (eb) => {
            eb.tag(Tag.SCIENCE).startEffect.resource(CardResource.MICROBE);
          }).br;
          b.action('消耗1微生物，抽1张蓝卡。', (eb) => {
            eb.resource(CardResource.MICROBE).startAction.cards(1);
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard): void {
    const count = player.tags.cardTagCount(card, Tag.SCIENCE);
    if (count > 0) {
      player.addResourceTo(this, {qty: count, log: true, from: {card: this}});
    }
  }

  public onNonCardTagAdded(player: IPlayer, tag: Tag): void {
    if (tag === Tag.SCIENCE) {
      player.addResourceTo(this, {qty: 1, log: true, from: {card: this}});
    }
  }

  public canAct(player: IPlayer): boolean {
    return this.resourceCount > 0 && this.hasActiveCardToDraw(player);
  }

  public action(player: IPlayer) {
    if (!this.canAct(player)) {
      return undefined;
    }

    player.removeResourceFrom(this, 1, {log: true});
    player.drawCard(1, {cardType: CardType.ACTIVE});
    return undefined;
  }

  private hasActiveCardToDraw(player: IPlayer): boolean {
    const deck = player.game.projectDeck;
    return deck.drawPile.some((card) => card.type === CardType.ACTIVE) ||
      deck.discardPile.some((card) => card.type === CardType.ACTIVE);
  }
}
