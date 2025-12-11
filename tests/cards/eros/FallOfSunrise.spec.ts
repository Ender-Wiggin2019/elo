import {expect} from 'chai';
import {FallOfSunrise} from '../../../src/server/cards/eros/FallOfSunrise';
import {CardName} from '../../../src/common/cards/CardName';
import {testGame, setRulingParty} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {Resource} from '../../../src/common/Resource';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {MAX_TEMPERATURE, REDS_RULING_POLICY_COST} from '../../../src/common/constants';


describe('FallOfSunrise', () => {
  let card: FallOfSunrise;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new FallOfSunrise();
    [game, player] = testGame(1, {turmoilExtension: true, skipInitialShuffling: true});
  });


  it('should play and increase temperature +1, gain 4 plants, no points', () => {
    const tempBefore = game.getTemperature();
    player.playCard(card);
    expect(player.playedCards.get(CardName.FALL_OF_SUNRISE)).to.exist;
    expect(player.getVictoryPoints().victoryPoints).to.eq(0);
    expect(player.stock.get(Resource.PLANTS)).to.eq(4);
    expect(game.getTemperature()).to.eq(tempBefore + 2);
  });

  it('should require extra cost if Reds ruling and temperature not max', () => {
    setRulingParty(game, PartyName.REDS);
    player.megaCredits = 15 + REDS_RULING_POLICY_COST - 1;
    expect(card.canPlay(player)).to.be.false;
    player.megaCredits = 15 + REDS_RULING_POLICY_COST;
    expect(card.canPlay(player)).to.be.true;
  });

  it('should not require extra cost if Reds ruling but temperature is max', () => {
    setRulingParty(game, PartyName.REDS);
    (game as any).temperature = MAX_TEMPERATURE;
    player.megaCredits = 15;
    expect(card.canPlay(player)).to.be.true;
  });

  it('should play when temperature is max (no increase), still gain 4 plants', () => {
    (game as any).temperature = MAX_TEMPERATURE;
    player.playCard(card);
    expect(player.stock.get(Resource.PLANTS)).to.eq(4);
    expect(game.getTemperature()).to.eq(MAX_TEMPERATURE);
  });

  it('should persist after serialization/deserialization', () => {
    player.playCard(card);
    const data = game.serialize();
    const game2 = game.loadFromJSON(data);
    const player2 = game2.players[0];
    const card2 = player2.playedCards.get(CardName.FALL_OF_SUNRISE);
    expect(card2).to.exist;
    expect(player2.getVictoryPoints().victoryPoints).to.eq(0);
    expect(player2.stock.get(Resource.PLANTS)).to.eq(4);
  });
});
