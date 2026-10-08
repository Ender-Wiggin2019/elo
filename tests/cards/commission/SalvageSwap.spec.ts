import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {BribedCommittee} from '../../../src/server/cards/base/BribedCommittee';
import {ImportedNitrogen} from '../../../src/server/cards/base/ImportedNitrogen';
import {SalvageSwap} from '../../../src/server/cards/commission/SalvageSwap';
import {CommunityWorker} from '../../../src/server/cards/eros/CommunityWorker';
import {PublicCelebrations} from '../../../src/server/cards/turmoil/PublicCelebrations';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast, runAllActions, setRulingParty, testGame} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';

describe('SalvageSwap', () => {
  let card: SalvageSwap;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new SalvageSwap();
    [game, player] = testGame(1, {turmoilExtension: true, skipInitialShuffling: true});
    player.megaCredits = card.cost;
  });

  it('has no printed tags and requires Scientists', () => {
    expect(card.type).to.eq(CardType.EVENT);
    expect(card.cost).to.eq(2);
    expect(card.tags).to.deep.eq([]);

    player.cardsInHand.push(new ImportedNitrogen());
    setRulingParty(game, PartyName.MARS);
    expect(player.canPlay(card)).to.be.false;
    setRulingParty(game, PartyName.SCIENTISTS);
    expect(player.canPlay(card)).to.be.true;
  });

  it('uses the event tag when the discarded event has no printed tags', () => {
    const discarded = new PublicCelebrations();
    const matchingEvent = new BribedCommittee();
    player.cardsInHand.push(discarded);
    game.projectDeck.drawPile = [matchingEvent];

    const selectCard = cast(card.play(player), SelectCard);
    selectCard.cb([discarded]);
    runAllActions(game);

    expect(player.cardsInHand).to.not.include(discarded);
    expect(player.cardsInHand).to.include(matchingEvent);
  });

  it('cannot be played when the only discardable card has no tags', () => {
    player.cardsInHand.push(new CommunityWorker());
    setRulingParty(game, PartyName.SCIENTISTS);

    expect(player.canPlay(card)).to.be.false;
  });

  it('does not offer untagged non-event cards when the hand also has a tagged card', () => {
    const untagged = new CommunityWorker();
    const tagged = new ImportedNitrogen();
    player.cardsInHand.push(untagged, tagged);

    const selectCard = cast(card.play(player), SelectCard);

    expect(selectCard.cards).to.deep.eq([tagged]);
  });

  it('draws only one card for the selected tag', () => {
    const discarded = new ImportedNitrogen();
    const matchingEarth = new BribedCommittee();
    const nonMatching = new ImportedNitrogen();
    player.cardsInHand.push(discarded);
    game.projectDeck.drawPile = [nonMatching, matchingEarth];

    const selectCard = cast(card.play(player), SelectCard);
    const tagChoice = cast(selectCard.cb([discarded]), OrOptions);
    const earthOption = tagChoice.options.find((option) => option.title === Tag.EARTH);
    expect(earthOption).to.exist;

    earthOption!.cb(undefined);
    runAllActions(game);

    expect(player.cardsInHand).to.include(matchingEarth);
    expect(player.cardsInHand).to.not.include(nonMatching);
  });
});
