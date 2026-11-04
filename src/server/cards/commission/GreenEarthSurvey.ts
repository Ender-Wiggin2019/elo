import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Resource} from '../../../common/Resource';
import {Tag} from '../../../common/cards/Tag';
import {Size} from '../../../common/cards/render/Size';
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
        description: '翻开并弃掉牌库顶牌，按其标签获得图示奖励（可叠加）。',
        renderData: CardRenderer.builder((b) => {
          b.cards(1, {size: Size.SMALL}).asterix().br;
          b.tag(Tag.PLANT, {size: Size.SMALL}).colon().plants(8, {size: Size.SMALL}).br;
          b.tag(Tag.EARTH, {size: Size.SMALL}).colon().titanium(6, {size: Size.SMALL}).br;
          b.text('两者皆无', Size.SMALL).colon().megacredits(4, {size: Size.SMALL});
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
