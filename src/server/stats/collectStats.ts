import {CardType} from '../../common/cards/CardType';
import {Phase} from '../../common/Phase';
import {normalizeUserId} from '../../common/utils/normalizeUserId';
import {StatsCardType} from '../../common/models/StatsModel';
import {ICard} from '../cards/ICard';
import {IGame} from '../IGame';
import {IPlayer} from '../IPlayer';
import {StatsGameFact, StatsPlayerFact} from './StatsTypes';

type ScoreParts = NonNullable<StatsPlayerFact['scoreParts']>;

/**
 * Capture the final, in-memory state of a completed game for statistics.
 *
 * This intentionally reads only the current tableau. Cards removed earlier in
 * the game are not part of a final snapshot and must not be counted again.
 */
export function collectStats(
  game: IGame,
  endedAt: number = Date.now(),
): StatsGameFact | undefined {
  if (game.phase !== Phase.END) {
    return undefined;
  }

  assertNonEmptyString(game.id, 'game id');
  assertFiniteNumber(endedAt, 'endedAt');
  assertDate(endedAt, 'endedAt');
  const board = game.gameOptions.boardName;
  if (typeof board !== 'string') {
    throw new Error('Invalid board');
  }
  assertNonEmptyString(board, 'board');
  assertFiniteNumber(game.generation, 'generation');

  const players = game.getAllPlayers();
  if (players.length === 0) {
    throw new Error('Cannot collect stats for a game without players');
  }

  const solo = game.isSoloMode();
  const positions = solo ?
    new Map<IPlayer, number>([[players[0], 1]]) :
    positionsFromSortedPlayers(game, players);
  const soloWon = solo ? game.isSoloModeWin() : undefined;

  const seats = players.map((player, seat) => {
    const position = positions.get(player);
    if (position === undefined) {
      throw new Error(`Player ${player.id} is missing from final ranking`);
    }

    const breakdown = player.getVictoryPoints();
    const score = assertFiniteNumber(breakdown.total, `score for ${player.id}`);
    const scoreParts = collectScoreParts(breakdown, player.id);

    return {
      seat,
      accountId: player.userId ? normalizeUserId(player.userId) : null,
      score,
      position,
      won: solo ? soloWon === true : position === 1,
      scoreParts,
      cards: collectCards(player),
    } satisfies StatsPlayerFact;
  });

  return {
    gameId: game.id,
    endedAt,
    day: new Date(endedAt).toISOString().slice(0, 10),
    players: players.length,
    generations: game.generation,
    ranked: game.isRankMode(),
    board,
    cardsComplete: true,
    seats,
  };
}

function positionsFromSortedPlayers(
  game: IGame,
  players: ReadonlyArray<IPlayer>,
): Map<IPlayer, number> {
  const roster = new Set(players);
  const sortedPlayers = (
    game as IGame & {getSortedPlayers: () => Array<IPlayer>}
  ).getSortedPlayers();
  if (sortedPlayers.length !== players.length) {
    throw new Error('Final ranking does not contain the full player roster');
  }

  const positions = new Map<IPlayer, number>();
  sortedPlayers.forEach((player, position) => {
    if (!roster.has(player) || positions.has(player)) {
      throw new Error('Final ranking contains an invalid player roster');
    }
    positions.set(player, position + 1);
  });
  return positions;
}

function collectScoreParts(
  breakdown: ReturnType<IPlayer['getVictoryPoints']>,
  playerId: string,
): ScoreParts {
  const tr = assertFiniteNumber(
    breakdown.terraformRating,
    `terraform rating for ${playerId}`,
  );
  const cards = assertFiniteNumber(
    breakdown.victoryPoints,
    `card points for ${playerId}`,
  );
  const greenery = assertFiniteNumber(
    breakdown.greenery,
    `greenery points for ${playerId}`,
  );
  const city = assertFiniteNumber(
    breakdown.city,
    `city points for ${playerId}`,
  );
  const milestones = assertFiniteNumber(
    breakdown.milestones,
    `milestone points for ${playerId}`,
  );
  const awards = assertFiniteNumber(
    breakdown.awards,
    `award points for ${playerId}`,
  );
  const total = assertFiniteNumber(breakdown.total, `score for ${playerId}`);
  const other = total - tr - cards - greenery - city - milestones - awards;
  assertFiniteNumber(other, `other points for ${playerId}`);

  return {tr, cards, greenery, city, milestones, awards, other};
}

function collectCards(player: IPlayer): StatsPlayerFact['cards'] {
  const cards: StatsPlayerFact['cards'] = [];
  const seenNames = new Set<string>();

  for (const card of player.playedCards.asArray()) {
    const name = card.name;
    if (typeof name !== 'string') {
      throw new Error('Invalid final tableau card name');
    }
    assertNonEmptyString(name, 'final tableau card name');
    if (seenNames.has(name)) {
      continue;
    }
    seenNames.add(name);

    const type = classifyCard(card);
    const vp = assertFiniteNumber(
      card.getVictoryPoints(player),
      `victory points for card ${name}`,
    );
    cards.push({name, type, vp});
  }

  return cards;
}

function classifyCard(card: ICard): StatsCardType {
  switch (card.type) {
  case CardType.CORPORATION:
    return 'corporation';
  case CardType.PRELUDE:
    return 'prelude';
  case CardType.CEO:
    return 'ceo';
  case CardType.ACTIVE:
  case CardType.AUTOMATED:
  case CardType.EVENT:
    return 'project';
  default:
    throw new Error(`Unsupported final tableau card type: ${card.type}`);
  }
}

function assertFiniteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid ${label}: expected a finite number`);
  }
  return value;
}

function assertDate(value: number, label: string): void {
  if (Number.isNaN(new Date(value).getTime())) {
    throw new Error(`Invalid ${label}: expected a valid date`);
  }
}

function assertNonEmptyString(value: string, label: string): void {
  if (value.trim() === '') {
    throw new Error(`Invalid ${label}: expected a non-empty string`);
  }
}
