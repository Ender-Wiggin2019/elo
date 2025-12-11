
import {IPlayer} from '../../../IPlayer';
import {CardRenderer} from '../../render/CardRenderer';
import {CardName} from '../../../../common/cards/CardName';
import {Tag} from '../../../../common/cards/Tag';
import {CorporationCard} from '../../corporation/CorporationCard';
import {IStandardProjectCard} from '../../IStandardProjectCard';

export class _Thorgate_ extends CorporationCard {
  constructor() {
    super({
      name: CardName._THORGATE_,
      tags: [Tag.POWER, Tag.SCIENCE],
      startingMegaCredits: 44,

      behavior: {
        production: {energy: 2},
      },

      cardDiscount: {tag: Tag.POWER, amount: 3},
      metadata: {
        cardNumber: 'R13',
        description: 'You start with 2 energy production and 44 M€.',
        renderData: CardRenderer.builder((b) => {
          b.br;
          b.production((pb) => pb.energy(2)).nbsp.megacredits(44);
          b.corpBox('effect', (ce) => {
            ce.effect('When playing a power card OR THE STANDARD PROJECT POWER PLANT, you pay 3 M€ less for it.', (eb) => {
              // TODO(chosta): energy().played needs to be power() [same for space()]
              eb.tag(Tag.POWER).asterix().startEffect.megacredits(-3);
            });
          });
        }),
      },
    });
  }


  public getStandardProjectDiscount(_player: IPlayer, card: IStandardProjectCard): number {
    if (card.name === CardName.POWER_PLANT_STANDARD_PROJECT) {
      return 3;
    }
    return 0;
  }
}

