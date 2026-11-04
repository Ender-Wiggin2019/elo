import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {CardName} from '../../../src/common/cards/CardName';
import {Tag} from '../../../src/common/cards/Tag';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {IGame} from '../../../src/server/IGame';
import {PoliticalLobbying} from '../../../src/server/cards/commission/PoliticalLobbying';
import {SelectParty} from '../../../src/server/inputs/SelectParty';
import {Turmoil} from '../../../src/server/turmoil/Turmoil';
import {TestPlayer} from '../../TestPlayer';
import {cast, fakeCard, formatMessage, testGame} from '../../TestingUtils';

describe('PoliticalLobbying', () => {
  let game: IGame;
  let player: TestPlayer;
  let card: PoliticalLobbying;
  let turmoil: Turmoil;

  beforeEach(() => {
    [game, player] = testGame(1, {turmoilExtension: true});
    card = new PoliticalLobbying();
    turmoil = game.turmoil!;
  });

  it('has the expected commissioned active card properties', () => {
    expect(card.cost).to.eq(6);
    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.tags).to.deep.eq([Tag.VENUS]);
    expect(card.metadata.cardNumber).to.eq('XB86');
    expect(card.name).to.eq(CardName.POLITICAL_LOBBYING);
  });

  it('requires one Venus tag to play', () => {
    player.cardsInHand = [card];
    player.megaCredits = card.cost;
    expect(player.getPlayableCards()).does.not.include(card);

    player.playedCards.push(fakeCard({tags: [Tag.VENUS]}));
    expect(player.getPlayableCards()).includes(card);
  });

  it('cannot act without one of its delegates in the lobby', () => {
    turmoil.delegateReserve.clear();
    expect(card.canAct(player)).is.false;

    turmoil.delegateReserve.add(player);
    expect(card.canAct(player)).is.true;
  });

  it('moves one delegate from the lobby to the selected party and logs the movement', () => {
    const marsFirst = turmoil.getPartyByName(PartyName.MARS);
    turmoil.delegateReserve.clear();
    turmoil.delegateReserve.add(player);

    card.action(player);
    expect(game.deferredActions).has.lengthOf(1);
    expect(turmoil.delegateReserve.get(player)).to.eq(1);
    expect(marsFirst.delegates.get(player)).to.eq(0);

    const selectParty = cast(game.deferredActions.peek()!.execute(), SelectParty);
    selectParty.cb(PartyName.MARS);

    expect(turmoil.delegateReserve.get(player)).to.eq(0);
    expect(marsFirst.delegates.get(player)).to.eq(1);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === 'blue sent 1 delegate(s) in Mars First area')).to.have.length(1);
  });
});
