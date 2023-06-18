import {CardName} from '../../../common/cards/CardName';
import {Player} from '../../Player';
import {CardType} from '../../../common/cards/CardType';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {Delegate} from '../../turmoil/Turmoil';
import {TurmoilUtil} from '../../turmoil/TurmoilUtil';
import {PartyName} from '../../../common/turmoil/PartyName';
import {SelectOption} from '../../inputs/SelectOption';
import {OrOptions} from '../../inputs/OrOptions';
import {Game} from '../../Game';
import {IParty} from '../../turmoil/parties/IParty';
import {all} from '../Options';
import {PlayerId} from '../../../common/Types';
import {newMessage} from '../../logs/MessageBuilder';

export class AnOfferYouCantRefuse extends Card {
  constructor() {
    super({
      name: CardName.AN_OFFER_YOU_CANT_REFUSE,
      type: CardType.EVENT,
      cost: 5,

      metadata: {
        description: 'Exchange a NON-NEUTRAL opponent delegate with one of your own from the reserve. This exchange may not change the party leader. You may then move your delegate to another party.',
        cardNumber: 'M62',
        renderData: CardRenderer.builder((b) => {
          b.minus().delegates(1, {all}).asterix().nbsp.plus().delegates(1);
        }),
      },
    });
  }

  private isReplaceableDelegate(delegate: Delegate, player: Player, party: IParty): delegate is PlayerId {
    if (delegate === player.id || delegate === 'NEUTRAL') {
      return false;
    }

    // This can't happen. It just appeases the compiler.
    if (party.partyLeader === undefined) {
      return false;
    }

    // If you're the party leader and the delegate isn't neutral, the exchange is OK.
    if (party.partyLeader === player.id) {
      return true;
    }

    const partyLeaderDelegateCount = party.delegates.get(party.partyLeader);
    const yourDelegateCount = party.delegates.get(player.id);

    if (delegate !== party.partyLeader) {
      // The only reason you might not replace a non-party leader delegate is if you don't start with
      // the same number of delegates as the party leader.
      return yourDelegateCount < partyLeaderDelegateCount;
    } else {
      // You can't replace a party leader's delegate the party leader doesn't have at least two more delegates. Otherwise
      // you can take the lead.
      if (partyLeaderDelegateCount - yourDelegateCount <= 1) {
        return false;
      }
      // You also can't replace a party leader's delegate if another non-party leader has the same number of delegates as the
      // current party leader. Otherwise that other player's delegate would take the lead.
      for (const m of party.delegates.multiplicities()) {
        if (m[0] === party.partyLeader || m[0] === player.id) {
          continue;
        }
        if (m[1] === partyLeaderDelegateCount) {
          return false;
        }
      }
      return true;
    }
  }

  // You can play this if you have an available delegate, and if you can swap with a non-neutral delegate without changing the party leader
  public override bespokeCanPlay(player: Player) {
    const turmoil = TurmoilUtil.getTurmoil(player.game);
    if (!turmoil.hasDelegatesInReserve(player.id)) {
      return false;
    }

    for (const party of turmoil.parties) {
      for (const delegate of party.delegates.keys()) {
        if (this.isReplaceableDelegate(delegate, player, party)) {
          return true;
        }
      }
    }
    return false;
  }

  private moveToAnotherParty(game: Game, from: PartyName, delegate: Player): OrOptions {
    const orOptions = new OrOptions();
    const turmoil = TurmoilUtil.getTurmoil(game);

    turmoil.parties.forEach((party) => {
      if (party.name === from) {
        orOptions.options.push(new SelectOption('Do not move', '', () => {
          return undefined;
        }));
      } else {
        orOptions.options.push(new SelectOption(party.name, 'Select', () => {
          turmoil.removeDelegateFromParty(delegate.id, from, game);
          turmoil.sendDelegateToParty(delegate.id, party.name, game);
          return undefined;
        }));
      }
    });

    return orOptions;
  }

  public override bespokePlay(player: Player) {
    const game = player.game;
    const turmoil = TurmoilUtil.getTurmoil(game);
    const orOptions = new OrOptions();

    for (const party of turmoil.parties) {
      for (const delegate of party.delegates.keys()) {
        if (!this.isReplaceableDelegate(delegate, player, party)) {
          continue;
        }
        const option = new SelectOption(newMessage('${0} / ${1}', (b) => b.party(party).playerId(delegate)), 'Select', () => {
          turmoil.replaceDelegateFromParty(delegate, player.id, party.name, game);
          turmoil.checkDominantParty(); // Check dominance right after replacement (replace doesn't check dominance.)
          return this.moveToAnotherParty(game, party.name, player);
        });
        orOptions.options.push(option);
      }
    }
    return orOptions;
  }
}
