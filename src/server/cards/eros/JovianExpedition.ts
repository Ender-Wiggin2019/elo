import {IProjectCard} from '../IProjectCard';
import {Player} from '../../Player';
import {Game} from '../../Game';
import {BuildColony} from '../../deferredActions/BuildColony';
import {CardRequirements} from '../CardRequirements';
import {CardRenderer} from '../render/CardRenderer';
import {SelectColony} from '../../inputs/SelectColony';
import {Card} from '../Card';
import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {ColonyName} from '../../../common/colonies/ColonyName';
import {IColony} from '../../colonies/IColony';
import {ColoniesHandler} from '../../colonies/ColoniesHandler';

export class JovianExpedition extends Card implements IProjectCard {
  constructor() {
    super({
      cost: 20,
      tags: [Tag.JOVIAN, Tag.SPACE],
      name: CardName.JOVIAN_EXPEDITION,
      type: CardType.AUTOMATED,
      victoryPoints: 1,

      requirements: CardRequirements.builder((b) => b.colonies()),
      metadata: {
        cardNumber: 'Q08',
        renderData: CardRenderer.builder((b) => {
          b.placeColony().nbsp.colonies(1);
        }),
        description: 'Requires a colony. Add a colony tile(NOT TITANIA) and place a colony.',
      },
    });
  }

  public override bespokeCanPlay(player: Player): boolean {
    let coloniesCount: number = 0;
    player.game.colonies.forEach((colony) => {
      coloniesCount += colony.colonies.filter((owner) => owner === player).length;
    });
    return coloniesCount > 0;
  }

  public override bespokePlay(player: Player) {
    const game = player.game;
    if (!game.gameOptions.coloniesExtension) return undefined;

    const availableColonies: IColony[] = game.discardedColonies.filter((x) => x.name !== ColonyName.TITANIA);
    if (availableColonies.length === 0) return undefined;

    const selectColony = new SelectColony('Select colony tile to add', 'Add colony tile', availableColonies, (colony: IColony) => {
      if (availableColonies.includes(colony)) {
        game.colonies.push(colony);
        game.colonies.sort((a, b) => (a.name > b.name) ? 1 : -1);
        game.log('${0} added a new Colony tile: ${1}', (b) => b.player(player).colony(colony));
        this.checkActivation(colony, game);
        game.defer(new BuildColony(player, {title: 'Select colony for Jovian Expedition'}));
        return undefined;
      }
      return undefined;
    },
    );
    return selectColony;
  }

  private checkActivation(colony: IColony, game: Game): void {
    if (colony.isActive) return;
    if (colony.metadata.cardResource === undefined) return;
    for (const player of game.getPlayers()) {
      for (const card of player.tableau) {
        const active = ColoniesHandler.maybeActivateColony(colony, card);
        if (active) {
          return;
        }
      }
    }
  }
}
