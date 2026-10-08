import {expect} from 'chai';
import {GreenhouseEffect} from '../../../src/server/cards/commission/GreenhouseEffect';
import {runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('GreenhouseEffect', () => {
  it('gives its owner 4 heat when the owner places a city', () => {
    const card = new GreenhouseEffect();
    const [game, player, otherPlayer] = testGame(2);
    player.megaCredits = 100;
    player.playCard(card);

    const initialHeat = player.heat;
    game.addCity(player, game.board.getAvailableSpacesOnLand(player)[0]);
    expect(player.heat).to.eq(initialHeat + 4);

    game.addCity(otherPlayer, game.board.getAvailableSpacesOnLand(otherPlayer)[0]);
    runAllActions(game);
    expect(player.heat).to.eq(initialHeat + 4);
    expect(otherPlayer.heat).to.eq(0);
  });
});
