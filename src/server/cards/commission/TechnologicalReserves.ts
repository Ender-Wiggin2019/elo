import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';
import {questionmark} from '../render/DynamicVictoryPoints';

export class TechnologicalReserves extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.TECHNOLOGICAL_RESERVES,
      tags: [],
      cost: 15,
      victoryPoints: 'special',

      metadata: {
        cardNumber: 'XB88',
        description: '终局时，你手牌中每3张未打出的牌计1 VP。',
        renderData: CardRenderer.builder((b) => b.vpText('每3张未打出的手牌计1 VP。')),
        victoryPoints: questionmark(),
      },
    });
  }

  public override getVictoryPoints(player: IPlayer): number {
    return Math.floor(player.cardsInHand.length / 3);
  }
}
