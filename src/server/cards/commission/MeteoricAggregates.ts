import {CardName} from '../../../common/cards/CardName';
import {Tag} from '../../../common/cards/Tag';
import {CardResource} from '../../../common/CardResource';
import {Resource} from '../../../common/Resource';
import {IPlayer} from '../../IPlayer';
import {IActionCard} from '../ICard';
import {CorporationCard} from '../corporation/CorporationCard';
import {CardRenderer} from '../render/CardRenderer';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SelectCard} from '../../inputs/SelectCard';

export class MeteoricAggregates extends CorporationCard implements IActionCard {
  constructor() {
    super({
      name: CardName.METEORIC_AGGREGATES,
      tags: [Tag.EARTH, Tag.SPACE],
      startingMegaCredits: 40,
      resourceType: CardResource.ASTEROID,
      metadata: {
        cardNumber: 'XB85',
        description: '初始获得40 M€、1钢铁和1钛。',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(40).steel(1).titanium(1).br;
          b.action('在你的任意一张卡上增加1个陨石，或在本牌上增加2个陨石。', (ab) => {
            ab.empty().startAction.resource(CardResource.ASTEROID).asterix().or().resource(CardResource.ASTEROID, 2);
          }).br;
          b.effect('打出带有产能的项目卡时，可以消耗本牌上的陨石，每个抵3 M€。', (eb) => {
            eb.production((pb) => pb.wild(1)).startEffect.resource(CardResource.ASTEROID).equals().megacredits(3);
          });
        }),
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    player.stock.add(Resource.STEEL, 1, {log: true, from: {card: this}});
    player.stock.add(Resource.TITANIUM, 1, {log: true, from: {card: this}});
    return undefined;
  }

  public canAct(): boolean {
    return true;
  }

  public action(player: IPlayer) {
    const addHere = () => {
      player.addResourceTo(this, {qty: 2, log: true, from: {card: this}});
      return undefined;
    };
    const cards = player.getResourceCards(CardResource.ASTEROID);
    if (cards.length === 0) {
      return addHere();
    }
    return new OrOptions(
      new SelectOption('在星岩建材上增加2个陨石', '确认').andThen(addHere),
      new SelectCard('选择一张卡增加1个陨石', '确认', cards).andThen(([card]) => {
        player.addResourceTo(card, {qty: 1, log: true, from: {card: this}});
        return undefined;
      }),
    );
  }
}
