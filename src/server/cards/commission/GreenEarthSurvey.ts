import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Resource} from '../../../common/Resource';
import {Tag} from '../../../common/cards/Tag';
import {CanAffordOptions, IPlayer} from '../../IPlayer';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';

export class GreenEarthSurvey extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.GREEN_EARTH_SURVEY,
      tags: [],
      cost: 10,
      requirements: {tag: Tag.EARTH, count: 2},

      metadata: {
        cardNumber: 'XB97',
        description: '需要2个地球标签。翻开并弃掉项目牌库顶牌；若有植物标签，获得8个植物；若有地球标签，获得6个钛；若两者均无，获得4M€。',
        renderData: CardRenderer.builder((b) => {
          b.cards(1).asterix().br;
          b.tag(Tag.PLANT).slash().plants(8).br;
          b.tag(Tag.EARTH).slash().titanium(6).br;
          b.noTags().slash().megacredits(4);
        }),
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer, _canAffordOptions: CanAffordOptions): boolean {
    return player.game.projectDeck.canDraw(1);
  }

  public override bespokePlay(player: IPlayer) {
    const card = player.game.projectDeck.drawOrThrow(player.game);
    player.game.log('${0} revealed and discarded ${1}', (b) => b.player(player).card(card, {tags: true}));

    const hasPlantTag = card.tags.includes(Tag.PLANT);
    const hasEarthTag = card.tags.includes(Tag.EARTH);
    if (hasPlantTag) {
      player.stock.add(Resource.PLANTS, 8, {log: true, from: {card: this}});
    }
    if (hasEarthTag) {
      player.stock.add(Resource.TITANIUM, 6, {log: true, from: {card: this}});
    }
    if (!hasPlantTag && !hasEarthTag) {
      player.stock.add(Resource.MEGACREDITS, 4, {log: true, from: {card: this}});
    }

    player.game.projectDeck.discard(card);
    return undefined;
  }
}
