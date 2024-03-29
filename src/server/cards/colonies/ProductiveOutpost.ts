import {IProjectCard} from '../IProjectCard';
import {CardType} from '../../../common/cards/CardType';
import {Player} from '../../Player';
import {CardName} from '../../../common/cards/CardName';
import {SimpleDeferredAction} from '../../deferredActions/DeferredAction';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {Size} from '../../../common/cards/render/Size';

export class ProductiveOutpost extends Card implements IProjectCard {
  constructor() {
    super({
      cost: 0,
      name: CardName.PRODUCTIVE_OUTPOST,
      type: CardType.AUTOMATED,

      metadata: {
        cardNumber: 'C30',
        renderData: CardRenderer.builder((b) => {
          b.text('Gain all your colony bonuses.', Size.SMALL, true);
        }),
      },
    });
  }

  public override bespokePlay(player: Player) {
    player.game.colonies.forEach((colony) => {
      colony.colonies.filter((owner) => owner === player).forEach((owner) => {
        // Not using GiveColonyBonus deferred action because it's only for the active player
        player.game.defer(new SimpleDeferredAction(player, () => colony.giveColonyBonus(owner)));
      });
    });
    return undefined;
  }
}
