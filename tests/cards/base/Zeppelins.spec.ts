import {expect} from 'chai';
import {setOxygenLevel} from '../../TestingUtils';
import {Zeppelins} from '../../../src/server/cards/base/Zeppelins';
import {Game} from '../../../src/server/Game';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('Zeppelins', function() {
  let card: Zeppelins;
  let player: TestPlayer;
  let game: Game;

  beforeEach(function() {
    card = new Zeppelins();
    [game, player] = testGame(2);
  });

  it('Can not play', function() {
    setOxygenLevel(game, 4);
    expect(player.simpleCanPlay(card)).is.not.true;
  });
  it('Should play', function() {
    setOxygenLevel(game, 5);
    expect(player.simpleCanPlay(card)).is.true;

    const lands = game.board.getAvailableSpacesOnLand(player);
    game.addCityTile(player, lands[0]);

    card.play(player);
    expect(player.production.megacredits).to.eq(1);
    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
