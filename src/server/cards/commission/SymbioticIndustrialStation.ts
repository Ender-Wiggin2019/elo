import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {Resource} from '../../../common/Resource';
import {Payment} from '../../../common/inputs/Payment';
import {IPlayer} from '../../IPlayer';
import {IActionCard, ICard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectCard} from '../../inputs/SelectCard';
import {SelectOption} from '../../inputs/SelectOption';
import {PlayerInput} from '../../PlayerInput';
import {CardRenderer} from '../render/CardRenderer';
import {questionmark} from '../render/DynamicVictoryPoints';
import {Size} from '../../../common/cards/render/Size';
import {digit} from '../Options';

export class SymbioticIndustrialStation extends Card implements IProjectCard, IActionCard {
  public data: {victoryPoints: number} = {victoryPoints: 0};

  constructor() {
    super({
      name: CardName.SYMBIOTIC_INDUSTRIAL_STATION,
      type: CardType.ACTIVE,
      tags: [Tag.BUILDING],
      cost: 7,
      victoryPoints: 'special',

      metadata: {
        cardNumber: 'XB67',
        renderData: CardRenderer.builder((b) => {
          b.action(undefined, (eb) => {
            eb.steel(3, {digit, size: Size.SMALL}).startAction
              .plants(4, {digit, size: Size.SMALL}).or(Size.SMALL).titanium(3, {digit, size: Size.SMALL});
          }).br;
          b.action(undefined, (eb) => {
            eb.steel(1, {size: Size.SMALL}).startAction.text('1 VP', Size.SMALL);
          }).br;
          b.action(undefined, (eb) => {
            eb.steel(1, {size: Size.SMALL}).startAction.resource(CardResource.ASTEROID, {size: Size.SMALL}).asterix(Size.SMALL);
          }).br;
          b.plainText('行动：任选一项。小行星须放在另一张卡牌上。').br;
          b.vpText('所获VP累计至终局。');
        }),
        victoryPoints: questionmark(),
      },
    });
  }

  public canAct(player: IPlayer): boolean {
    return player.steel >= 1;
  }

  public action(player: IPlayer): PlayerInput | undefined {
    const options: Array<PlayerInput> = [];

    if (player.steel >= 3) {
      options.push(new SelectOption('Spend 3 steel to gain 4 plants', 'Gain plants').andThen(() => {
        player.pay(Payment.of({steel: 3}));
        player.stock.add(Resource.PLANTS, 4, {log: true});
        return undefined;
      }));
      options.push(new SelectOption('Spend 3 steel to gain 3 titanium', 'Gain titanium').andThen(() => {
        player.pay(Payment.of({steel: 3}));
        player.stock.add(Resource.TITANIUM, 3, {log: true});
        return undefined;
      }));
    }

    if (player.steel >= 1) {
      options.push(new SelectOption('Spend 1 steel to gain 1 VP', 'Gain VP').andThen(() => {
        player.pay(Payment.of({steel: 1}));
        this.data.victoryPoints += 1;
        player.game.log('${0} gained 1 VP from ${1}', (b) => b.player(player).card(this));
        return undefined;
      }));
    }

    const asteroidCards = this.getAsteroidCards(player);
    if (player.steel >= 1 && asteroidCards.length === 1) {
      const target = asteroidCards[0];
      options.push(new SelectOption(`Add 1 asteroid to ${target.name}`, 'Add asteroid').andThen(() => {
        player.pay(Payment.of({steel: 1}));
        player.addResourceTo(target, {log: true});
        return undefined;
      }));
    } else if (player.steel >= 1 && asteroidCards.length > 1) {
      options.push(new SelectCard('Select card to add 1 asteroid', 'Add asteroid', asteroidCards)
        .andThen(([target]) => {
          player.pay(Payment.of({steel: 1}));
          player.addResourceTo(target, {log: true});
          return undefined;
        }));
    }

    const orOptions = new OrOptions(...options);
    return orOptions.reduce();
  }

  public override getVictoryPoints(_player: IPlayer): number {
    return this.data?.victoryPoints ?? 0;
  }

  private getAsteroidCards(player: IPlayer): Array<ICard> {
    return player.getResourceCards(CardResource.ASTEROID).filter((card) => card !== this);
  }
}
