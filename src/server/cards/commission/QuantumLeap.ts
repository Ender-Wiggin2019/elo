import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Resource} from '../../../common/Resource';
import {IPlayer} from '../../IPlayer';
import {Priority} from '../../deferredActions/Priority';
import {CorporationCard} from '../corporation/CorporationCard';
import {ICard, isIActionCard} from '../ICard';
import {CardRenderer} from '../render/CardRenderer';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';

const STARTING_MEGACREDITS = 49;

export class QuantumLeap extends CorporationCard {
  constructor() {
    super({
      name: CardName.QUANTUM_LEAP,
      startingMegaCredits: STARTING_MEGACREDITS,
      behavior: {drawCard: 1},
      metadata: {
        cardNumber: 'XB94',
        description: `你起始拥有${STARTING_MEGACREDITS} M€和1张牌。`,
        renderData: CardRenderer.builder((b) => {
          b.megacredits(STARTING_MEGACREDITS).cards(1);
          b.corpBox('effect', (ce) => {
            ce.effect('当你打出蓝卡时，选择获得2 M€，或立刻额外执行该卡的行动一次。此额外行动不消耗该卡本世代的正常行动次数。', (eb) => {
              eb.cards(1).asterix().startEffect.megacredits(2).or().text('行动').asterix();
            });
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard): void {
    if (card.type !== CardType.ACTIVE) {
      return;
    }

    // Resolve initial resources and other play effects before checking the action's cost.
    player.defer(() => {
      const gainMegacredits = () => {
        player.stock.add(Resource.MEGACREDITS, 2, {log: true, from: {card: this}});
        return undefined;
      };
      if (!isIActionCard(card) || !card.canAct(player)) {
        return gainMegacredits();
      }
      return new OrOptions(
        new SelectOption('获得2 M€', '获得').andThen(gainMegacredits),
        new SelectOption('额外执行该卡的行动一次', '行动').andThen(() => {
          player.game.log('${0} used ${1} action with ${2}', (b) => b.player(player).card(card).card(this));
          return card.action(player);
        }),
      );
    }, Priority.BACK_OF_THE_LINE);
  }
}
