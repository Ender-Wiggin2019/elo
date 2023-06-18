import {IProjectCard} from '../IProjectCard';
import {Player} from '../../Player';
import {CardRenderer} from '../render/CardRenderer';
import {CardRequirements} from '../CardRequirements';
import {Card} from '../Card';
import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Size} from '../../../common/cards/render/Size';
import {Tag} from '../../../common/cards/Tag';
import {Resource} from '../../../common/Resource';

export class UrgentTerraformingCommand extends Card implements IProjectCard {
  constructor() {
    super({
      name: CardName.URGENT_TERRAFORMING_COMMAND,
      type: CardType.EVENT,
      tags: [Tag.EARTH],
      cost: 10,
      requirements: CardRequirements.builder((b) => b.tr(25)),

      metadata: {
        cardNumber: 'Q16',
        renderData: CardRenderer.builder((b) => {
          b.text('IMMEDIATE PRODUCE', Size.SMALL, true).br;
          b.plants(1).asterix().nbsp.heat(1).asterix();
        }),
        description: 'Requires that you have at least 25 TR.you gain plants and heat equal to your plants and heat production',
      },
    });
  }
  public override bespokeCanPlay(player: Player): boolean {
    return player.getTerraformRating() >= 25;
  }
  public override bespokePlay(player: Player) {
    player.addResource(Resource.PLANTS, player.production.get(Resource.PLANTS));
    player.addResource(Resource.HEAT, player.production.get(Resource.HEAT));
    return undefined;
  }
}
