import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {CardType} from '../../../common/cards/CardType';
import {Size} from '../../../common/cards/render/Size';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Resource} from '../../../common/Resource';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {Priority} from '../../deferredActions/Priority';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {Card} from '../Card';
import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {CardRenderer} from '../render/CardRenderer';

export class ScienceCountercurrent extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      name: CardName.SCIENCE_COUNTERCURRENT,
      type: CardType.ACTIVE,
      tags: [Tag.SCIENCE],
      cost: 15,
      resourceType: CardResource.SCIENCE,
      requirements: {party: PartyName.REDS},
      victoryPoints: 1,

      metadata: {
        cardNumber: 'XB87',
        renderData: CardRenderer.builder((b) => {
          b.effect('每次提升TR，可降低1级M€产量并在本牌增加1个科学资源（多格也仅触发一次）。', (eb) => {
            eb.tr(1).startEffect.production((pb) => pb.megacredits(-1)).resource(CardResource.SCIENCE);
          }).br;
          b.action('消耗1科学，抽3留1弃2。', (eb) => {
            eb.resource(CardResource.SCIENCE, {size: Size.SMALL}).startAction.cards(3, {size: Size.SMALL}).asterix();
          });
        }),
      },
    });
  }

  public onIncreaseTerraformRatingByAnyPlayer(cardOwner: IPlayer, player: IPlayer, steps: number): void {
    if (cardOwner !== player || steps <= 0 || player.production.megacredits <= -5) {
      return;
    }

    player.defer(() => {
      if (player.production.megacredits <= -5) {
        return undefined;
      }

      return new OrOptions(
        new SelectOption('降低 1 级 M€ 产量，在本卡增加 1 个科学资源').andThen(() => {
          player.production.add(Resource.MEGACREDITS, -1, {log: true, from: {card: this}});
          player.addResourceTo(this, {qty: 1, log: true, from: {card: this}});
          return undefined;
        }),
        new SelectOption('跳过').andThen(() => undefined),
      );
    }, Priority.GAIN_RESOURCE_OR_PRODUCTION);
  }

  public canAct(player: IPlayer): boolean {
    return this.resourceCount > 0 && player.game.projectDeck.canDraw(1);
  }

  public action(player: IPlayer): undefined {
    player.removeResourceFrom(this, 1, {log: true});
    player.drawCardKeepSome(3, {keepMax: 1});
    return undefined;
  }
}
