import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';
import {Counter} from '../../behavior/Counter';
import {Resource} from '../../../common/Resource';

export class TechnologicalSeedlings extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.TECHNOLOGICAL_SEEDLINGS,
      tags: [Tag.SCIENCE, Tag.PLANT],
      cost: 11,

      metadata: {
        cardNumber: 'XB90',
        description: '打出时，按你拥有的科学标签数量（包括本牌）获得等量植物。',
        renderData: CardRenderer.builder((b) => b.plants(1).slash().tag(Tag.SCIENCE)),
      },
    });
  }

  public override bespokePlay(player: IPlayer): undefined {
    const scienceTags = new Counter(player, this).count({tag: Tag.SCIENCE});
    player.stock.add(Resource.PLANTS, scienceTags, {log: true, from: {card: this}});
    return undefined;
  }
}
