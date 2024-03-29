import {expect} from 'chai';
import {RadSuits} from '../../../src/server/cards/base/RadSuits';
import {Game} from '../../../src/server/Game';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('RadSuits', function() {
  let card: RadSuits;
  let player: TestPlayer;
  let game: Game;

  beforeEach(function() {
    card = new RadSuits();
    [game, player] = testGame(2);
  });

  it('Can not play', function() {
    expect(player.simpleCanPlay(card)).is.not.true;
  });

  it('Should play', function() {
    const lands = game.board.getAvailableSpacesOnLand(player);
    game.addCityTile(player, lands[0]);
    game.addCityTile(player, lands[1]);

    expect(player.simpleCanPlay(card)).is.true;
    card.play(player);

    expect(player.production.megacredits).to.eq(1);
    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
