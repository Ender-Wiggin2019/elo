import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {CardRenderer} from '../render/CardRenderer';
import {ActionCard} from '../ActionCard';
import {IProjectCard} from '../IProjectCard';

export class PoliticalLobbying extends ActionCard implements IProjectCard {
  constructor() {
    super({
      name: CardName.POLITICAL_LOBBYING,
      type: CardType.ACTIVE,
      tags: [Tag.MARS],
      cost: 6,
      requirements: {tag: Tag.MARS, count: 1},

      action: {
        turmoil: {
          sendDelegates: {count: 1},
        },
      },

      metadata: {
        cardNumber: 'XB86',
        renderData: CardRenderer.builder((b) => {
          b.action(
            '将你的1个议员从大厅派到任意政党。',
            (eb) => eb.empty().startAction.delegates(1),
          );
        }),
        description: '需要1个火星标签。将你的1个议员从大厅派到任意政党。',
      },
    });
  }
}
