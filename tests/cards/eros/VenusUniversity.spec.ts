import {expect} from 'chai';
import {VenusUniversity} from '../../../src/server/cards/eros/VenusUniversity';
import {CardName} from '../../../src/common/cards/CardName';
import {setVenusScaleLevel} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {Phase} from '../../../src/common/Phase';


describe('VenusUniversity', () => {
  let card: VenusUniversity;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: import('../../../src/server/IGame').IGame;

  beforeEach(() => {
    card = new VenusUniversity();
    [game, player, player2] = testGame(2, {venusNextExtension: true, skipInitialShuffling: true});
  });

  it('should not be playable before Venus 8%', () => {
    expect(game.getVenusScaleLevel()).to.be.lessThan(8);
    expect(card.canPlay(player)).to.be.false;
  });

  it('should be playable at Venus 8% and give 1 VP', () => {
    setVenusScaleLevel(game, 8);
    expect(card.canPlay(player)).to.be.true;
    player.playCard(card);
    expect(player.playedCards.get(CardName.VENUS_UNIVERSITY)).to.exist;
    expect(card.getVictoryPoints(player)).to.eq(1);
  });

  it('should draw a card each time Venus Rate increases', () => {
    game.phase = Phase.ACTION;
    setVenusScaleLevel(game, 8);
    player.playCard(card);
    expect(player.cardsInHand.length).to.eq(0);
    game.increaseVenusScaleLevel(player, 1);
    expect(player.cardsInHand.length).to.eq(1);
    game.increaseVenusScaleLevel(player, 2);
    expect(player.cardsInHand.length).to.eq(3);

    game.phase = Phase.SOLAR;
    game.increaseVenusScaleLevel(player, 1);
    expect(player.cardsInHand.length).to.eq(3);
  });

  it('should not trigger when other player increases Venus Rate', () => {
    setVenusScaleLevel(game, 8);
    player.playCard(card);
    expect(player.cardsInHand.length).to.eq(0);
    game.increaseVenusScaleLevel(player2, 2);
    expect(player.cardsInHand.length).to.eq(0);
  });

  it('should persist after serialization/deserialization', () => {
    game.phase = Phase.ACTION;
    setVenusScaleLevel(game, 8);
    player.playCard(card);
    game.increaseVenusScaleLevel(player, 1);
    expect(player.cardsInHand.length).to.eq(1);
    const data = game.serialize();
    const game2 = game.loadFromJSON(data);
    const player2_ = game2.players[0];
    expect(player2_.playedCards.get(CardName.VENUS_UNIVERSITY)).to.exist;
    game2.increaseVenusScaleLevel(player2_, 2);
    expect(player2_.cardsInHand.length).to.eq(3);
  });
});
