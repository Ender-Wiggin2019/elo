import {CardRenderer} from '../../render/CardRenderer';
import {Card} from '../../Card';
import {ICard} from '../../ICard';
import {CardName} from '../../../../common/cards/CardName';
import {CardType} from '../../../../common/cards/CardType';
import {ICorporationCard} from '../../corporation/ICorporationCard';
import {Player} from '../../../Player';
import {Tag} from '../../../../common/cards/Tag';
import {SelectAmount} from '../../../inputs/SelectAmount';
import {DiscardCards} from '../../../deferredActions/DiscardCards';
import {DrawCards} from '../../../deferredActions/DrawCards';
import {Size} from '../../../../common/cards/render/Size';

export class TeiaiGroup extends Card implements ICard, ICorporationCard {
  constructor() {
    super({
      name: CardName.TEIAI_GROUP,
      tags: [Tag.BUILDING],
      startingMegaCredits: 47,
      type: CardType.CORPORATION,

      metadata: {
        cardNumber: 'Q028',
        description: '',
        renderData: CardRenderer.builder((b) => {
          b.br.br.br;
          b.megacredits(47).br;
          b.text('(You start with 47 MC.)', Size.TINY, false, false);
          b.corpBox('action', (ce) => {
            ce.vSpace(Size.LARGE);
            ce.action('If you have no card, draw 2 card.', (eb) => {
              eb.empty().startAction.text('2').cards(1).asterix();
            });
            ce.action('Or you can discard X cards to draw X-1 cards. Maximum X is current generation number.', (eb) => {
              eb.or().text('X').cards(1).startAction.text('X-1').cards(1);
            });
          });
        }),
      },
    });
  }

  public canAct(): boolean {
    return true;
  }

  public action(player: Player) {
    if (player.cardsInHand.length === 0) {
      player.drawCard(2);
    } else {
      const max = Math.min(player.cardsInHand.length, player.game.generation);

      return new SelectAmount(
        'Select number of cards to discard',
        'Discard cards',
        (amount: number) => {
          player.game.defer(new DiscardCards(player, amount));
          player.game.defer(DrawCards.keepAll(player, amount-1));
          return undefined;
        },
        1,
        max,
      );
    }
    return undefined;
  }
}
