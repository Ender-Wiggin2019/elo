import {expect} from 'chai';
import {Phase} from '../../src/common/Phase';
import {BoardName} from '../../src/common/boards/BoardName';
import {GameNotFoundError, IDatabase} from '../../src/server/database/IDatabase';
import {SerializedGame} from '../../src/server/SerializedGame';
import {SerializedPlayer} from '../../src/server/SerializedPlayer';
import {StatsBackfillCursor, StatsGameFact, StatsLegacyResult} from '../../src/server/stats/StatsTypes';
import {backfillStats, collectLegacyStats} from '../../src/server/stats/backfillStats';

function legacyResult(overrides: Partial<StatsLegacyResult> = {}): StatsLegacyResult {
  return {
    gameId: 'g1',
    createdAt: '2026-10-08 12:34:56.123',
    players: 2,
    generations: 10,
    gameOptions: {boardName: BoardName.THARSIS, rankOption: false} as StatsLegacyResult['gameOptions'],
    scores: [
      {corporation: 'Ecoline', playerScore: 70, player: 'Alice', userId: 'u123456789012345-token'},
      {corporation: '', playerScore: 60, player: 'Guest', userId: undefined},
    ],
    outcomes: [
      {accountId: 'u123456789012', position: 1, phase: Phase.END},
    ],
    ...overrides,
  };
}

function archivedPlayer(
  id: string,
  name: string,
  userId: string | undefined,
  megaCredits: number,
  cards: Array<string>,
  corporations: Array<string> = [],
): SerializedPlayer {
  return {
    id,
    name,
    userId,
    megaCredits,
    playedCards: cards.map((card) => ({name: card})),
    corporations: corporations.map((card) => ({name: card})),
  } as unknown as SerializedPlayer;
}

function archivedGame(players: Array<SerializedPlayer>, phase: Phase = Phase.END): SerializedGame {
  return {
    id: 'g1',
    phase,
    players,
    exitedPlayers: [],
  } as unknown as SerializedGame;
}

describe('collectLegacyStats', () => {
  it('uses legacy scores, normalized outcomes, and the archived final tableau without recomputing VP', () => {
    const result = legacyResult();
    const serialized = archivedGame([
      archivedPlayer('p1', 'Alice', 'u123456789012999-secret', 20, ['Birds', 'Loan'], ['Ecoline', 'Birds']),
      archivedPlayer('p2', 'Guest', undefined, 5, ['Unknown historical card']),
    ]);

    const fact = collectLegacyStats(result, serialized);

    expect(fact).to.deep.include({
      gameId: 'g1',
      endedAt: new Date('2026-10-08 12:34:56.123').getTime(),
      day: '2026-10-08',
      players: 2,
      generations: 10,
      ranked: false,
      board: BoardName.THARSIS,
      cardsComplete: false,
    });
    expect(fact?.seats[0]).to.include({
      accountId: 'u123456789012',
      score: 70,
      position: 1,
      won: true,
      scoreParts: null,
    });
    expect(fact?.seats[0].cards).to.deep.equal([
      {name: 'Birds', type: 'project', vp: null},
      {name: 'Loan', type: 'prelude', vp: null},
      {name: 'Ecoline', type: 'corporation', vp: null},
    ]);
    expect(fact?.seats[1]).to.include({accountId: null, score: 60, position: 2, won: false});
    expect(fact?.seats[1].cards).to.deep.equal([]);
  });

  it('accepts a complete account-only historical result without an archive', () => {
    const result = legacyResult({
      gameOptions: {boardName: BoardName.HELLAS, rankOption: true} as StatsLegacyResult['gameOptions'],
      scores: [
        {corporation: '', playerScore: 48, player: 'Alice', userId: 'u-alice-long-token'},
        {corporation: '', playerScore: 44, player: 'Bob', userId: 'u-bob-long-token'},
      ],
      outcomes: [
        {accountId: 'u-alice-long-token', position: 1, phase: Phase.END},
        {accountId: 'u-bob-long-token', position: 2, phase: Phase.END},
      ],
    });

    const fact = collectLegacyStats(result);

    expect(fact?.cardsComplete).to.equal(false);
    expect(fact?.ranked).to.equal(true);
    expect(fact?.board).to.equal(BoardName.HELLAS);
    expect(fact?.seats.map((seat) => [seat.accountId, seat.position, seat.scoreParts])).to.deep.equal([
      ['u-alice-long-', 1, null],
      ['u-bob-long-to', 2, null],
    ]);
  });

  it('rejects non-END snapshots and mismatched outcomes, but recovers old casual rankings from complete archives', () => {
    const result = legacyResult();
    const players = [
      archivedPlayer('p1', 'Alice', 'u123456789012999-secret', 20, []),
      archivedPlayer('p2', 'Guest', undefined, 5, []),
    ];

    expect(collectLegacyStats(result, archivedGame(players, Phase.ACTION))).to.equal(undefined);
    expect(collectLegacyStats({...result, outcomes: []}, archivedGame(players))?.seats.map((seat) => seat.position)).deep.eq([1, 2]);
    expect(collectLegacyStats({...result, outcomes: []})).eq(undefined);
    expect(collectLegacyStats({...result, outcomes: [{accountId: 'u-other', position: 1, phase: Phase.END}]}, archivedGame(players))).to.equal(undefined);
  });
});

describe('backfillStats', () => {
  it('bounds batches, resumes from the precise cursor, and falls back for missing archives', async () => {
    const accountOnlyScores = [
      {corporation: '', playerScore: 48, player: 'Alice', userId: 'u-alice-long-token'},
      {corporation: '', playerScore: 44, player: 'Bob', userId: 'u-bob-long-token'},
    ];
    const accountOnlyOutcomes = [
      {accountId: 'u-alice-long-token', position: 1, phase: Phase.END},
      {accountId: 'u-bob-long-token', position: 2, phase: Phase.END},
    ];
    const rows = [
      legacyResult({gameId: 'g1', scores: accountOnlyScores, outcomes: accountOnlyOutcomes}),
      legacyResult({gameId: 'g2', createdAt: '2026-10-08 12:34:57.123', scores: accountOnlyScores, outcomes: accountOnlyOutcomes}),
      legacyResult({gameId: 'g3', createdAt: '2026-10-08 12:34:58.123', scores: accountOnlyScores, outcomes: accountOnlyOutcomes}),
    ];
    const calls: Array<{since: string; cursor?: StatsBackfillCursor; limit?: number}> = [];
    const saved: Array<StatsGameFact> = [];
    const database = {
      getStatsRepository: () => ({save: async (fact: StatsGameFact) => saved.push(fact)}),
      getStatsBackfillBatch: async (since: string, cursor?: StatsBackfillCursor, limit?: number) => {
        calls.push({since, cursor, limit});
        const start = cursor === undefined ? 0 : rows.findIndex((row) => row.gameId === cursor.gameId) + 1;
        return rows.slice(start, start + (limit ?? rows.length));
      },
      getGame: async (gameId: string): Promise<SerializedGame> => {
        throw new GameNotFoundError(gameId);
      },
    } as unknown as IDatabase;

    const first = await backfillStats(database, {
      days: 180,
      maxGames: 2,
      batchSize: 50,
      delayMs: 0,
      now: Date.parse('2026-10-08T12:35:00.000Z'),
    });
    const second = await backfillStats(database, {
      maxGames: 1,
      batchSize: 20,
      delayMs: 0,
      now: Date.parse('2026-10-08T12:35:00.000Z'),
      cursor: first.cursor,
    });

    expect(first).to.include({scanned: 2, imported: 2, skipped: 0, failed: 0, hasMore: true});
    expect(first.cursor).to.deep.equal({createdAt: rows[1].createdAt, gameId: 'g2'});
    expect(second).to.include({scanned: 1, imported: 1, skipped: 0, failed: 0, hasMore: true});
    expect(second.cursor).to.deep.equal({createdAt: rows[2].createdAt, gameId: 'g3'});
    expect(calls[0].limit).to.equal(2);
    expect(calls[1].cursor).to.deep.equal(first.cursor);
    expect(saved.every((fact) => fact.cardsComplete === false)).to.equal(true);
  });
});
