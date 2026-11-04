import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {Size} from '../../../common/cards/render/Size';
import {Resource} from '../../../common/Resource';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../ICard';
import {CorporationCard} from '../corporation/CorporationCard';
import {CardRenderer} from '../render/CardRenderer';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {Priority} from '../../deferredActions/Priority';
import {SerializedCard} from '../../SerializedCard';
import {resource as dynamicResourceVictoryPoints} from '../render/DynamicVictoryPoints';

const STARTING_FIGHTERS = 5;
const TRIGGER_TAGS = [Tag.JOVIAN, Tag.MARS, Tag.ANIMAL];

export class SparkfireEcology extends CorporationCard {
  constructor() {
    super({
      name: CardName.SPARKFIRE_ECOLOGY,
      startingMegaCredits: 45,
      resourceType: CardResource.FIGHTER,
      behavior: {
        stock: {titanium: 5},
      },
      victoryPoints: 'special',

      metadata: {
        cardNumber: 'XB93',
        description: '你起始拥有45 M€、5钛和5个战斗机资源。',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(45).titanium(5).resource(CardResource.FIGHTER, STARTING_FIGHTERS).br;
          b.vpText('每个战斗机使你少2 VP。').br;
          b.effect('每打出1个木星、火星或动物标，可移除1战斗机获得1钛；若无战斗机，可获得3钛并翻面，失去所有效果和标签。', (eb) => {
            eb.tag(Tag.JOVIAN, {size: Size.SMALL}).tag(Tag.MARS, {size: Size.SMALL}).tag(Tag.ANIMAL, {size: Size.SMALL})
              .startEffect.titanium(1, {size: Size.SMALL});
          });
        }),
        victoryPoints: dynamicResourceVictoryPoints(CardResource.FIGHTER, -2, 1),
      },
    });
  }

  public isDisabled = false;

  public override get tags(): Array<Tag> {
    return this.isDisabled ? [] : [Tag.SPACE];
  }

  public override bespokePlay(player: IPlayer) {
    player.addResourceTo(this, {qty: STARTING_FIGHTERS, log: true, from: {card: this}});
    return undefined;
  }

  public override getVictoryPoints(_player: IPlayer): number {
    if (this.isDisabled) {
      return 0;
    }
    return -2 * this.resourceCount;
  }

  public onCardPlayed(player: IPlayer, card: ICard): void {
    if (this.isDisabled || !player.playedCards.has(this.name)) {
      return;
    }
    if (card.type === CardType.PROXY) {
      return;
    }

    const triggerCount = card.tags.filter((tag) => TRIGGER_TAGS.includes(tag)).length;
    for (let i = 0; i < triggerCount; i++) {
      // Compute the choices when the deferred action executes. Earlier tags on
      // the same card may have removed the last fighter or disabled this card.
      player.defer(() => this.effectOptions(player), Priority.SUPERPOWER);
    }
  }

  private effectOptions(player: IPlayer): OrOptions | undefined {
    if (this.isDisabled) {
      return undefined;
    }

    if (this.resourceCount > 0) {
      return new OrOptions(
        new SelectOption('移除1个战斗机，获得1钛', '获得钛').andThen(() => {
          if (this.isDisabled || this.resourceCount <= 0) {
            return undefined;
          }
          player.removeResourceFrom(this, 1, {log: true});
          player.stock.add(Resource.TITANIUM, 1, {log: true, from: {card: this}});
          return undefined;
        }),
        new SelectOption('跳过', '跳过'),
      );
    }

    return new OrOptions(
      new SelectOption('获得3钛并将本牌翻面', '翻面').andThen(() => {
        if (this.isDisabled || this.resourceCount > 0) {
          return undefined;
        }
        player.stock.add(Resource.TITANIUM, 3, {log: true, from: {card: this}});
        this.disable(player);
        return undefined;
      }),
      new SelectOption('跳过', '跳过'),
    );
  }

  private disable(player: IPlayer): void {
    player.playedCards.retagCard(this, () => {
      this.isDisabled = true;
    });
    player.game.log('${0}将${1}翻面，失去其所有效果和标签', (b) => b.player(player).card(this));
  }

  public serialize(serialized: SerializedCard): void {
    serialized.isDisabled = this.isDisabled;
  }

  public deserialize(serialized: SerializedCard): void {
    this.isDisabled = Boolean(serialized.isDisabled);
  }
}
