import {expect} from 'chai';
import {EnergySupply} from '../../../src/server/cards/eros/EnergySupply';
import {CardName} from '../../../src/common/cards/CardName';
import {testGame} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {Resource} from '../../../src/common/Resource';


describe('EnergySupply', () => {
  let card: EnergySupply;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new EnergySupply();
    [game, player] = testGame(1, {skipInitialShuffling: true});
  });


  it('should play and gain 3 energy, no points', () => {
    player.playCard(card);
    expect(player.playedCards.get(CardName.ENERGY_SUPPLY)).to.exist;
    expect(player.getVictoryPoints().victoryPoints).to.eq(0);
    expect(player.stock.get(Resource.ENERGY)).to.eq(3);
  });

  it('should persist after serialization/deserialization', () => {
    player.playCard(card);
    const data = game.serialize();
    const game2 = game.loadFromJSON(data);
    const player2 = game2.players[0];
    const card2 = player2.playedCards.get(CardName.ENERGY_SUPPLY);
    expect(card2).to.exist;
    expect(player2.getVictoryPoints().victoryPoints).to.eq(0);
    expect(player2.stock.get(Resource.ENERGY)).to.eq(3);
  });
});
