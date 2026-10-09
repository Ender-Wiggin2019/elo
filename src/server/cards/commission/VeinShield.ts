import {IProjectCard} from '../IProjectCard';
import {IActionCard} from '../ICard';
import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {digit} from '../Options';
import {Size} from '../../../common/cards/render/Size';

export class VeinShield extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      name: CardName.VEIN_SHIELD,
      type: CardType.ACTIVE,
      tags: [Tag.PLANT],
      cost: 8,

      metadata: {
        cardNumber: 'XB73',
        renderData: CardRenderer.builder((b) => {
          b.effect('When another player removes your plants, gain 2 M€ per plant removed.', (eb) => {
            eb.minus().plants(1, {digit, size: Size.SMALL}).asterix(Size.SMALL).startEffect.megacredits(2, {size: Size.SMALL});
          }).br;
          b.action('Spend 3 plants to gain 3 titanium.', (eb) => {
            eb.plants(3, {digit, size: Size.SMALL}).startAction.titanium(3, {digit, size: Size.SMALL});
          });
        }),
      },
    });
  }

  public canAct(player: IPlayer): boolean {
    return player.stock.get(Resource.PLANTS) >= 3;
  }

  public action(player: IPlayer): undefined {
    player.stock.deduct(Resource.PLANTS, 3, {log: true});
    player.stock.add(Resource.TITANIUM, 3, {log: true, from: {card: this}});
    return undefined;
  }

  public onPlantRemoved(player: IPlayer, amount: number): void {
    if (amount > 0) {
      player.stock.add(Resource.MEGACREDITS, amount * 2, {log: true, from: {card: this}});
    }
  }
}
