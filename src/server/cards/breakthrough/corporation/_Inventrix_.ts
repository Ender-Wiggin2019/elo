import {CardName} from '../../../../common/cards/CardName';
import {CardType} from '../../../../common/cards/CardType';
import {Tag} from '../../../../common/cards/Tag';
import {Player} from '../../../Player';
import {Card} from '../../Card';
import {ICorporationCard} from '../../corporation/ICorporationCard';
import {CardRenderer} from '../../render/CardRenderer';

export class _Inventrix_ extends Card implements ICorporationCard {
  constructor() {
    super({
      type: CardType.CORPORATION,
      name: CardName._INVENTRIX_,
      tags: [Tag.SCIENCE, Tag.SCIENCE],
      initialActionText: 'Draw 3 cards',
      startingMegaCredits: 45,

      metadata: {
        cardNumber: 'R43',
        description: 'As your first action in the game, draw 3 cards. Start with 45 M€.',
        renderData: CardRenderer.builder((b) => {
          b.br.br;
          b.megacredits(45).nbsp.cards(3);
          b.corpBox('effect', (ce) => {
            ce.effect('Your temperature, oxygen, ocean, and Venus requirements are +3 or -3 steps, your choice in each case.', (eb) => {
              eb.plate('Global requirements').startEffect.text('+/- 3');
            });
          });
        }),
      },
    });
  }

  public initialAction(player: Player) {
    player.drawCard(3);
    return undefined;
  }

  public getRequirementBonus(_player: Player): number {
    return 3;
  }
}
