import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {CardResource} from '../../../common/CardResource';
import {Resource} from '../../../common/Resource';
import {ICard} from '../../cards/ICard';
import {CorporationCard} from '../corporation/CorporationCard';

const STARTING_MEGACREDITS = 48;

export class Protogen extends CorporationCard {
  constructor() {
    super({
      name: CardName.PROTOGEN,
      tags: [Tag.MICROBE],
      startingMegaCredits: STARTING_MEGACREDITS,
      behavior: {drawCard: {count: 1, tag: Tag.MICROBE}},

      metadata: {
        cardNumber: 'XB06',
        description: `你起始拥有${STARTING_MEGACREDITS} M€，并抽取1张微生物标志卡牌。`,
        renderData: CardRenderer.builder((b) => {
          b.br.br.br;
          b.megacredits(STARTING_MEGACREDITS).cards(1, {secondaryTag: Tag.MICROBE});
          b.corpBox('effect', (ce) => {
            ce.effect('When you gain microbes in one action, also gain 2 heat.', (eb) => {
              eb.resource(CardResource.MICROBE).asterix().startEffect.heat(2);
            });
          });
        }),
      },
    });
  }


  // public override initialAction(player: IPlayer) {
  //   player.drawCard(2, {tag: Tag.MICROBE});
  //   return undefined;
  // }
  public onResourceAdded(player: IPlayer, card: ICard) {
    if (card.resourceType === CardResource.MICROBE) {
      player.stock.add(Resource.HEAT, 2);
    }
  }
}
