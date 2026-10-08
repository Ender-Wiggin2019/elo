import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {Tag} from '../../../common/cards/Tag';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Card} from '../Card';
import {CardRenderer} from '../render/CardRenderer';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {SelectCard} from '../../inputs/SelectCard';
import {SelectOption} from '../../inputs/SelectOption';
import {OrOptions} from '../../inputs/OrOptions';

export class SalvageSwap extends Card implements IProjectCard {
  constructor() {
    super({
      name: CardName.SALVAGE_SWAP,
      type: CardType.EVENT,
      tags: [],
      cost: 2,
      requirements: {party: PartyName.SCIENTISTS},

      metadata: {
        cardNumber: 'XB65',
        renderData: CardRenderer.builder((b) => {
          b.cards(1, {secondaryTag: Tag.WILD, cancelled: true}).arrow().cards(1, {secondaryTag: Tag.WILD});
        }),
        description: 'Requires Scientists ruling or that you have 2 delegates there. Discard 1 card. Choose 1 tag from it and draw 1 card with that tag.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.getDiscardableCards(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const cardsInHand = this.getDiscardableCards(player);
    if (cardsInHand.length === 0) {
      return undefined;
    }

    return new SelectCard('Select 1 card to discard', 'Discard', cardsInHand)
      .andThen(([card]) => {
        player.discardCardFromHand(card, {log: true});

        const tags = [...card.tags];
        if (card.type === CardType.EVENT) {
          tags.push(Tag.EVENT);
        }

        const uniqueTags = Array.from(new Set(tags));
        const options = uniqueTags.map((tag) => new SelectOption(tag, 'Draw').andThen(() => {
          player.drawCard(1, {tag});
          return undefined;
        }));

        if (options.length === 0) {
          return undefined;
        }
        if (options.length === 1) {
          return options[0].cb(undefined);
        }
        return new OrOptions(...options);
      });
  }

  private getDiscardableCards(player: IPlayer): Array<IProjectCard> {
    return player.cardsInHand.filter((card) => card !== this && (card.tags.length > 0 || card.type === CardType.EVENT));
  }
}
