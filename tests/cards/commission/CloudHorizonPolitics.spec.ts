import {expect} from 'chai';
import {CardResource} from '../../../src/common/CardResource';
import {CardType} from '../../../src/common/cards/CardType';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Tag} from '../../../src/common/cards/Tag';
import {CloudHorizonPolitics} from '../../../src/server/cards/commission/CloudHorizonPolitics';
import {IGame} from '../../../src/server/IGame';
import {SelectParty} from '../../../src/server/inputs/SelectParty';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {TestPlayer} from '../../TestPlayer';
import {cast, fakeCard, formatMessage, runAllActions, testGame} from '../../TestingUtils';

describe('CloudHorizonPolitics', () => {
  let card: CloudHorizonPolitics;
  let game: IGame;
  let player: TestPlayer;
  let otherPlayer: TestPlayer;

  beforeEach(() => {
    card = new CloudHorizonPolitics();
    [game, player, otherPlayer] = testGame(2, {turmoilExtension: true, skipInitialShuffling: true});
    player.megaCredits = 100;
  });

  it('has the expected active floater-card properties', () => {
    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.cost).to.eq(12);
    expect(card.tags).to.deep.eq([Tag.VENUS]);
    expect(card.resourceType).to.eq(CardResource.FLOATER);
    expect(card.victoryPoints).to.eq(1);
    expect(card.requirements).to.deep.eq([{tag: Tag.VENUS, count: 2}]);
    expect(card.metadata.cardNumber).to.eq('XB96');
  });

  it('adds one floater for each owned Venus card, including itself, once per card', () => {
    player.playedCards.push(fakeCard({tags: [Tag.VENUS, Tag.VENUS]}));
    player.cardsInHand = [card];

    player.playCard(card);
    runAllActions(game);
    cast(player.popWaitingFor(), SelectCard).cb([card]);
    runAllActions(game);
    expect(card.resourceCount).to.eq(1);

    player.playCard(fakeCard({tags: [Tag.VENUS, Tag.VENUS]}));
    runAllActions(game);
    cast(player.popWaitingFor(), SelectCard).cb([card]);
    runAllActions(game);
    expect(card.resourceCount).to.eq(2);
  });

  it('can skip or add a floater to another card with a source log', () => {
    player.playedCards.push(card);
    const otherCard = fakeCard({resourceType: CardResource.FLOATER});
    player.playedCards.push(otherCard);

    player.playCard(fakeCard({tags: [Tag.VENUS]}));
    runAllActions(game);
    const skip = cast(player.popWaitingFor(), SelectCard);
    expect(skip.config.min).eq(0);
    skip.cb([]);
    runAllActions(game);
    expect(card.resourceCount).eq(0);
    expect(otherCard.resourceCount).eq(0);

    player.playCard(fakeCard({tags: [Tag.VENUS]}));
    runAllActions(game);
    const choose = cast(player.popWaitingFor(), SelectCard);
    expect(choose.cards).includes(otherCard);
    choose.cb([otherCard]);
    runAllActions(game);
    expect(otherCard.resourceCount).eq(1);
    expect(card.resourceCount).eq(0);
    expect(game.gameLog.map(formatMessage).filter((entry) =>
      entry.includes(`added 1 ${CardResource.FLOATER}`) && entry.includes('from 🌸云际议政🌸'))).has.length(1);
  });

  it('does not trigger for another player', () => {
    player.playedCards.push(card);
    otherPlayer.playCard(fakeCard({tags: [Tag.VENUS]}));
    runAllActions(game);

    expect(card.resourceCount).to.eq(0);
  });

  it('spends two floaters to send one delegate to any party', () => {
    player.playedCards.push(card);
    card.resourceCount = 2;
    game.turmoil!.delegateReserve.clear();
    game.turmoil!.delegateReserve.add(player);

    expect(card.canAct(player)).to.be.true;
    card.action(player);
    expect(card.resourceCount).to.eq(0);

    const selectParty = cast(game.deferredActions.pop()!.execute(), SelectParty);
    selectParty.cb(PartyName.MARS);
    expect(game.turmoil!.getPartyByName(PartyName.MARS).delegates.get(player)).to.eq(1);
    expect(game.gameLog.map(formatMessage)).to.include('blue sent 1 delegate(s) in Mars First area');
    expect(game.gameLog.map(formatMessage)).to.include('blue removed 2 resource(s) from blue\'s 🌸云际议政🌸');
  });
});
