import {CardName} from '../../../common/cards/CardName';
import {Player} from '../../Player';
import {PlayerInput} from '../../PlayerInput';
import {CardRenderer} from '../render/CardRenderer';
import {CeoCard} from './CeoCard';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Size} from '../../../common/cards/render/Size';
import {Resource} from '../../../common/Resource';
import {TurmoilUtil} from '../../turmoil/TurmoilUtil';

export class Zan extends CeoCard {
  constructor() {
    super({
      name: CardName.ZAN,
      metadata: {
        cardNumber: 'L26',
        renderData: CardRenderer.builder((b) => {
          b.br.br;
          b.redsInactive().asterix();
          b.br.br;
          b.opgArrow().text('ALL', Size.SMALL).delegates(1).colon().reds().megacredits(1);
        }),
        description: 'You are immune to Reds\' ruling policy. Once per game, place all of your available delegates in Reds. Gain 1 M€ for each delegate placed this way.',
      },
    });
  }

  public action(player: Player): PlayerInput | undefined {
    this.isDisabled = true;
    const game = player.game;
    const turmoil = TurmoilUtil.getTurmoil(game);
    const totalDelegatesPlaced = turmoil.getAvailableDelegateCount(player.id);
    while (turmoil.getAvailableDelegateCount(player.id) > 0) {
      turmoil.sendDelegateToParty(player.id, PartyName.REDS, game);
    }
    player.addResource(Resource.MEGACREDITS, totalDelegatesPlaced, {log: true});
    return undefined;
  }
}
