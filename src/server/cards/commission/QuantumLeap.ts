import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {Priority} from '../../deferredActions/Priority';
import {CorporationCard} from '../corporation/CorporationCard';
import {isIActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';

export class QuantumLeap extends CorporationCard {
  constructor() {
    super({
      name: CardName.QUANTUM_LEAP,
      startingMegaCredits: 38,
      behavior: {drawCard: 1},
      metadata: {
        cardNumber: 'XB94',
        description: '你起始拥有38 M€和1张牌。',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(38).cards(1);
          b.corpBox('effect', (ce) => {
            ce.effect('当你从手牌打出一张有行动的蓝卡时，立刻额外执行该卡的行动一次（每张卡限一次）。此额外行动不消耗该卡本世代的正常行动次数。', (eb) => {
              eb.cards(1).asterix().startEffect.text('行动').asterix();
            });
          });
        }),
      },
    });
  }

  public data: {activatedCards: Array<CardName>} = {activatedCards: []};

  public onCardPlayedFromHand(player: IPlayer, card: IProjectCard): void {
    if (card.type !== CardType.ACTIVE || !isIActionCard(card) || this.data.activatedCards.includes(card.name)) {
      return;
    }

    this.data.activatedCards.push(card.name);
    // Resolve initial resources and other play effects before checking the action's cost.
    player.defer(() => {
      if (!card.canAct(player)) {
        return undefined;
      }
      player.game.log('${0} used ${1} action with ${2}', (b) => b.player(player).card(card).card(this));
      return card.action(player);
    }, Priority.BACK_OF_THE_LINE);
  }
}
