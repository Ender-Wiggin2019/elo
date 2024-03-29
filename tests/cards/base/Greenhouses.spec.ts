import {expect} from 'chai';
import {Greenhouses} from '../../../src/server/cards/base/Greenhouses';
import {testGame} from '../../TestGame';

describe('Greenhouses', function() {
  it('Should play', function() {
    const card = new Greenhouses();
    const [game, player, player2] = testGame(2);
    const action = card.play(player);

    expect(action).is.undefined;
    expect(player.plants).to.eq(0);

    game.addCityTile(player, game.board.getAvailableSpacesOnLand(player)[0]);
    game.addCityTile(player, game.board.getAvailableSpacesOnLand(player)[0]);
    game.addCityTile(player2, game.board.getAvailableSpacesOnLand(player2)[0]);
    card.play(player);

    expect(player.plants).to.eq(3);
    expect(player2.plants).to.eq(0);
  });
});
