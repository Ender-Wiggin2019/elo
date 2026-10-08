import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {CardResource} from '../../../common/CardResource';
import {Resource} from '../../../common/Resource';
import {IPlayer} from '../../IPlayer';
import {SelectAmount} from '../../inputs/SelectAmount';
import {Card} from '../Card';
import {IActionCard, ICard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

export class OrbitalMissiles extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      name: CardName.ORBITAL_MISSILES,
      type: CardType.ACTIVE,
      cost: 23,
      tags: [Tag.MARS, Tag.SPACE],
      requirements: {tag: Tag.EVENT, count: 5},
      victoryPoints: 1,
      resourceType: CardResource.FIGHTER,
      metadata: {
        cardNumber: 'XB76',
        description: '需要已打出5张事件卡。',
        renderData: CardRenderer.builder((b) => {
          b.effect('打出卡牌时（包括此卡），每个非事件标记加1战斗机。', (eb) => {
            eb.wild(1, {size: Size.SMALL}).startEffect.resource(CardResource.FIGHTER, {size: Size.SMALL});
          }).br;
          b.action('移除任意个战斗机，每个换1 M€。', (eb) => {
            eb.resource(CardResource.FIGHTER, {size: Size.SMALL}).text('X').startAction.megacredits(1, {size: Size.SMALL}).text('X');
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard): void {
    if (card.name === CardName.SCIENCE_TAG_BLANK_CARD) {
      return;
    }
    const count = card.tags.filter((tag) => tag !== Tag.EVENT).length;
    if (count > 0) {
      player.addResourceTo(this, {qty: count, log: true});
    }
  }

  public canAct(): boolean {
    return this.resourceCount > 0;
  }

  public action(player: IPlayer) {
    return new SelectAmount('移除多少个战斗机？', '兑换', 1, this.resourceCount, true).andThen((amount) => {
      player.removeResourceFrom(this, amount, {log: true});
      player.stock.add(Resource.MEGACREDITS, amount, {log: true, from: {card: this}});
      return undefined;
    });
  }
}
