import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {CardType} from '../../../common/cards/CardType';
import {Size} from '../../../common/cards/render/Size';
import {Tag} from '../../../common/cards/Tag';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {ICard} from '../ICard';
import {IPlayer} from '../../IPlayer';

export class MycelialSpread extends Card implements IProjectCard {
  constructor() {
    super({
      name: CardName.MYCELIAL_SPREAD,
      type: CardType.ACTIVE,
      cost: 11,
      tags: [Tag.MICROBE],
      victoryPoints: 1,
      resourceType: CardResource.DISEASE,

      metadata: {
        cardNumber: 'XB78',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a microbe tag, including this, add a disease resource here.',
            (eb) => eb.tag(Tag.MICROBE).startEffect.resource(CardResource.DISEASE)).br;
          b.effect('When playing a Jovian or Mars tag, diseases may be used as 4 M€ each.', (eb) => {
            eb.tag(Tag.JOVIAN).or().tag(Tag.MARS, {size: Size.MEDIUM}).startEffect.resource(CardResource.DISEASE).equals().megacredits(4);
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard): void {
    const qty = player.tags.cardTagCount(card, Tag.MICROBE);
    player.addResourceTo(this, {qty, log: true});
  }

  public onNonCardTagAdded(player: IPlayer, tag: Tag): void {
    if (tag === Tag.MICROBE) {
      player.addResourceTo(this, {qty: 1, log: true});
    }
  }
}
