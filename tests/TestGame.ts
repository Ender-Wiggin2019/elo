import {Game} from '../src/server/Game';
import {GameOptions} from '../src/server/GameOptions';
import {testGameOptions} from './TestingUtils';
import {TestPlayer} from './TestPlayer';
import {SelectInitialCards} from '../src/server/inputs/SelectInitialCards';

type _TestOptions = {
  /* skip initial card selection */
  skipInitialCardSelection: boolean;
}
export type TestGameOptions = GameOptions & _TestOptions;

function createPlayers(count: number, idSuffix: string): Array<TestPlayer> {
  return [
    TestPlayer.BLUE.newPlayer(false, idSuffix),
    TestPlayer.RED.newPlayer(false, idSuffix),
    TestPlayer.YELLOW.newPlayer(false, idSuffix),
    TestPlayer.GREEN.newPlayer(false, idSuffix),
    TestPlayer.BLACK.newPlayer(false, idSuffix),
    TestPlayer.PURPLE.newPlayer(false, idSuffix),
    TestPlayer.ORANGE.newPlayer(false, idSuffix),
    TestPlayer.PINK.newPlayer(false, idSuffix),
  ].slice(0, count);
}

/**
 * Creates a new game for testing. Has some hidden behavior for testing:
 *
 * 1. If aresExtension is true, and the player has not specifically enabled hazards, disable ares hazards.
 *    Hazard placement is non-deterministic.
 * 2. If skipInitialCardSelection is true, then the game ignores initial card selection. It's still
 *    in an intermediate state, but the game is testable.
 *
 * Players are returned in player order, so the first player returned is the first player.
 *
 * Test game has a return type with a spread array operator.
 */
export function testGame(count: number, customOptions?: Partial<TestGameOptions>, idSuffix = ''): [Game, ...Array<TestPlayer>] {
  const players = createPlayers(count, idSuffix);

  const copy = {...customOptions};
  if (copy.aresExtension === true && copy.aresHazards === undefined) {
    copy.aresHazards = true;
  }

  const options: GameOptions | undefined = customOptions === undefined ?
    undefined :
    testGameOptions(customOptions);

  const game = Game.newInstance(`game-id${idSuffix}`, players, players[0], options);
  if (customOptions?.skipInitialCardSelection !== false) {
    for (const player of players) {
      /* Removes waitingFor if it is SelectInitialCards. Used when wanting it cleared out for further testing. */
      if (player.getWaitingFor() instanceof SelectInitialCards) {
        player.popWaitingFor();
      }
    }
  }
  return [game, ...players];
}

export function getTestPlayer(game: Game, idx: number): TestPlayer {
  const players = game.getPlayers();
  const length = players.length;
  if (idx >= length) {
    throw new Error(`Invalid index ${idx} when game has ${length} players`);
  }
  return game.getPlayers()[idx] as TestPlayer;
}
