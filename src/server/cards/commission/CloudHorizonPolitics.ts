import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../ICard';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';
import {SelectCard} from '../../inputs/SelectCard';
import {Priority} from '../../deferredActions/Priority';
import {SendDelegateToArea} from '../../deferredActions/SendDelegateToArea';
import {TurmoilUtil} from '../../turmoil/TurmoilUtil';
import {digit} from '../Options';

export class CloudHorizonPolitics extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.CLOUD_HORIZON_POLITICS,
      tags: [Tag.VENUS],
      cost: 12,
      resourceType: CardResource.FLOATER,
      victoryPoints: 1,
      requirements: {tag: Tag.VENUS, count: 2},

      metadata: {
        cardNumber: 'XB96',
        description: '需要2个金星标签，计1VP。每当你打出带有金星标签的牌（包括本牌）时，可在任意卡牌上增加1个漂浮物。行动：移除本牌2个漂浮物，将1个代表派到任意党派。',
        renderData: CardRenderer.builder((b) => {
          b.effect('每当你打出带有金星标签的牌（包括本牌）时，可在任意卡牌上增加1个漂浮物。', (eb) => {
            eb.tag(Tag.VENUS).startEffect.resource(CardResource.FLOATER).asterix();
          }).br;
          b.action('移除本牌2个漂浮物，将1个代表派到任意党派。', (ab) => {
            ab.resource(CardResource.FLOATER, {amount: 2, digit}).startAction.delegates(1);
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    if (card.tags.includes(Tag.VENUS)) {
      player.defer(() => {
        const targets = player.getResourceCards(CardResource.FLOATER);
        if (targets.length === 0) {
          return undefined;
        }
        return new SelectCard('选择一张卡牌放置1个漂浮物（可跳过）', '放置漂浮物', targets, {min: 0, max: 1})
          .andThen(([target]) => {
            if (target !== undefined) {
              player.addResourceTo(target, {qty: 1, log: true, from: {card: this}});
            }
            return undefined;
          });
      }, Priority.GAIN_RESOURCE_OR_PRODUCTION);
    }
    return undefined;
  }

  public canAct(player: IPlayer): boolean {
    const turmoil = TurmoilUtil.getTurmoil(player.game);
    return this.resourceCount >= 2 && turmoil.getAvailableDelegateCount(player) > 0;
  }

  public action(player: IPlayer) {
    if (!this.canAct(player)) {
      return undefined;
    }

    player.removeResourceFrom(this, 2, {log: true});
    player.game.defer(new SendDelegateToArea(player));
    return undefined;
  }
}
