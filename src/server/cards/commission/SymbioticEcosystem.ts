import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Resource} from '../../../common/Resource';
import {IPlayer} from '../../IPlayer';
import {SelectCard} from '../../inputs/SelectCard';
import {SelectOption} from '../../inputs/SelectOption';
import {OrOptions} from '../../inputs/OrOptions';
import {IActionCard, ICard} from '../ICard';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';
import {message} from '../../logs/MessageBuilder';

export class SymbioticEcosystem extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SYMBIOTIC_ECOSYSTEM,
      tags: [Tag.MICROBE],
      cost: 11,
      resourceType: CardResource.MICROBE,
      victoryPoints: {resourcesHere: {}, per: 3},
      requirements: {party: PartyName.GREENS},

      metadata: {
        cardNumber: 'XB82',
        renderData: CardRenderer.builder((b) => {
          b.effect('每打出1个微生物标签（含本牌），在本牌增加1个微生物。', (eb) => {
            eb.tag(Tag.MICROBE).startEffect.resource(CardResource.MICROBE);
          }).br;
          b.action('消耗本牌1个微生物：获得2植物，或在你的另一张卡上增加1个动物。', (eb) => {
            eb.resource(CardResource.MICROBE).startAction.plants(2);
            eb.or().resource(CardResource.ANIMAL).asterix();
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard): void {
    const count = player.tags.cardTagCount(card, Tag.MICROBE);
    if (count > 0) {
      player.addResourceTo(this, {qty: count, log: true, from: {card: this}});
    }
  }

  public onNonCardTagAdded(player: IPlayer, tag: Tag): void {
    if (tag === Tag.MICROBE) {
      player.addResourceTo(this, {qty: 1, log: true, from: {card: this}});
    }
  }

  public canAct(_player: IPlayer): boolean {
    return this.resourceCount > 0;
  }

  public action(player: IPlayer) {
    if (!this.canAct(player)) {
      return undefined;
    }

    const animalCards = player.getResourceCards(CardResource.ANIMAL).filter((card) => card !== this);

    const gainPlants = new SelectOption('花费 1 个微生物，获得 2 个植物', '获得植物').andThen(() => {
      if (this.spendMicrobe(player)) {
        player.stock.add(Resource.PLANTS, 2, {log: true, from: {card: this}});
      }
      return undefined;
    });

    if (animalCards.length === 0) {
      return gainPlants.cb(undefined);
    }

    const addAnimal = animalCards.length === 1 ?
      new SelectOption(message('花费 1 个微生物，在${0}上增加 1 个动物', (b) => b.card(animalCards[0])), '增加动物').andThen(() => {
        if (this.spendMicrobe(player)) {
          player.addResourceTo(animalCards[0], {log: true, from: {card: this}});
        }
        return undefined;
      }) :
      new SelectCard('选择另一张卡增加 1 个动物', '增加动物', animalCards).andThen(([card]) => {
        if (this.spendMicrobe(player)) {
          player.addResourceTo(card, {log: true, from: {card: this}});
        }
        return undefined;
      });

    return new OrOptions(gainPlants, addAnimal);
  }

  private spendMicrobe(player: IPlayer): boolean {
    if (this.resourceCount <= 0) {
      return false;
    }
    player.removeResourceFrom(this, 1, {log: true});
    return true;
  }
}
