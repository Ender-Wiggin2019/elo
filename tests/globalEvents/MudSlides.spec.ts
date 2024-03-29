import {expect} from 'chai';
import {Game} from '../../src/server/Game';
import {MudSlides} from '../../src/server/turmoil/globalEvents/MudSlides';
import {Turmoil} from '../../src/server/turmoil/Turmoil';
import {TestPlayer} from '../TestPlayer';
import {testGame} from '../TestGame';
import {testGameOptions} from '../TestingUtils';
import {ISpace} from '../../src/server/boards/ISpace';
import {TileType} from '../../src/common/TileType';

describe('MudSlides', function() {
  let card: MudSlides;
  let player: TestPlayer;
  let game: Game;
  let turmoil: Turmoil;

  beforeEach(() => {
    card = new MudSlides();
    [game, player] = testGame(2);
    turmoil = Turmoil.newInstance(game);
    turmoil.initGlobalEvent(game);
  });

  it('resolve play', function() {
    const oceanTile = game.board.getAvailableSpacesForOcean(player)[0];
    game.addCityTile(player, game.board.getAdjacentSpaces(oceanTile)[0]);
    game.addOceanTile(player, oceanTile);
    player.megaCredits = 10;

    card.resolve(game, turmoil);

    expect(player.megaCredits).to.eq(6);
  });

  it('resolve play with overplaced tiles', function() {
    [game, player] = testGame(2, testGameOptions({aresExtension: true, turmoilExtension: true}));

    // Find two adjacent ocean spaces
    function adjacentOceans(): {first: ISpace, second: ISpace} {
      const oceanSpaces = game.board.getAvailableSpacesForOcean(player);
      for (const space of oceanSpaces) {
        const adjacentSpaces = game.board.getAdjacentSpaces(space);
        const adjacentOceans = adjacentSpaces.filter((space) => oceanSpaces.includes(space));
        if (adjacentOceans.length > 0) {
          return {first: space, second: adjacentOceans[0]};
        }
      }
      throw new Error('Not found');
    }

    const spaces = adjacentOceans();

    game.addOceanTile(player, spaces.first);
    game.addOceanTile(player, spaces.second);

    // Add an ocean city on top of the second ocean.
    const tile = {
      tileType: TileType.OCEAN_CITY,
      covers: spaces.second.tile,
    };
    game.gameOptions.aresExtension = true;
    player.game.addTile(player, spaces.second, tile);

    player.megaCredits = 10;

    card.resolve(game, turmoil);

    expect(player.megaCredits).to.eq(6);
  });
});
