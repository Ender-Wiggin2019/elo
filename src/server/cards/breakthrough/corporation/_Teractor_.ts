import {Player} from '../../../Player';
import {IProjectCard} from '../../IProjectCard';
import {CardRenderer} from '../../render/CardRenderer';
import {Card} from '../../Card';
import {played} from '../../Options';
import {CardName} from '../../../../common/cards/CardName';
import {CardType} from '../../../../common/cards/CardType';
import {Tag} from '../../../../common/cards/Tag';
import {ICorporationCard} from '../../corporation/ICorporationCard';

export class _Teractor_ extends Card implements ICorporationCard {
  constructor() {
    super({
      type: CardType.CORPORATION,
      name: CardName._TERACTOR_,
      tags: [Tag.EARTH],
      startingMegaCredits: 55,

      cardDiscount: {tag: Tag.EARTH, amount: 3},
      metadata: {
        cardNumber: 'R30',
        description: 'You start with 55 M€. As your first action, draw 1 earth tag card.',
        renderData: CardRenderer.builder((b) => {
          b.br.br;
          b.megacredits(55).nbsp.cards(1, {secondaryTag: Tag.EARTH});
          b.corpBox('effect', (ce) => {
            ce.effect('When you play an Earth tag, you pay 3 M€ less for it.', (eb) => {
              eb.earth(1, {played}).startEffect.megacredits(-3);
            });
          });
        }),
      },
    });
  }
  /* Start with 55 M€ and draw 1 earth card as first sction*/
  public initialAction(player: Player) {
    player.drawCard(1, {tag: Tag.EARTH});
    return undefined;
  }

  public override getCardDiscount(_player: Player, card: IProjectCard) {
    return card.tags.filter((tag) => tag === Tag.EARTH).length * 3;
  }
}
