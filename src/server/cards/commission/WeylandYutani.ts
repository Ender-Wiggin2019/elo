import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {all} from '../Options';
import {Resource} from '../../../common/Resource';
import {CorporationCard} from '../corporation/CorporationCard';
import {ICard} from '../ICard';

export class WeylandYutani extends CorporationCard {
  constructor() {
    super({
      name: CardName.WEYLAND_YUTANI,
      tags: [Tag.SCIENCE],
      startingMegaCredits: 50,
      initialActionText: 'Draw 1 card with a science tag',

      metadata: {
        cardNumber: 'XB01',
        description: 'You start with 50 M€.As your first action, draw 1 card with a science tag.',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(50).cards(1, {secondaryTag: Tag.SCIENCE});
          b.corpBox('effect', (ce) => {
            ce.vSpace(Size.LARGE);
            ce.effect(undefined, (eb) => {
              eb.tag(Tag.SCIENCE, {all}).startEffect;
              eb.megacredits(1, {all});
            });
            ce.vSpace();
            ce.effect('when a science tag is played, incl. this, THAT PLAYER gains 1 M€, and you gain 1 M€.', (eb) => {
              eb.tag(Tag.SCIENCE, {all}).startEffect;
              eb.megacredits(1);
            });
          });
        }),
      },
    });
  }


  public override initialAction(player: IPlayer) {
    player.drawCard(1, {tag: Tag.SCIENCE});
    return undefined;
  }

  public onNonCardTagAdded(player: IPlayer, tag: Tag, cardOwner?: IPlayer) {
    if (tag !== Tag.SCIENCE) {
      return;
    }
    player.stock.add(Resource.MEGACREDITS, 1, {log: true});
    cardOwner?.stock.add(Resource.MEGACREDITS, 1, {log: true});
  }

  public onCardPlayedByAnyPlayer(owner: IPlayer, card: ICard, currentPlayer: IPlayer) {
    for (const tag of card.tags) {
      if (tag === Tag.SCIENCE) {
        owner.stock.add(Resource.MEGACREDITS, 1, {log: true});
        currentPlayer.stock.add(Resource.MEGACREDITS, 1, {log: true});
      }
    }
  }
}
