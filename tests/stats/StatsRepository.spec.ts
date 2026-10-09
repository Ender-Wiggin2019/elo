import BetterSqlite3 = require('better-sqlite3');
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {StatsCardFilter, StatsGameFact} from '../../src/server/stats/StatsTypes';
import {StatsRepository, StatsSql, StatsSqlParam} from '../../src/server/stats/StatsRepository';

use(chaiAsPromised);

class SqliteStatsSql implements StatsSql {
  public readonly db: BetterSqlite3.Database;
  public readonly calls: Array<{sql: string; rowCount: number; keys: string[]}> = [];
  public transactions = 0;

  constructor() {
    this.db = new BetterSqlite3(':memory:');
  }

  public async query(sql: string, params: Array<StatsSqlParam> = []): Promise<any[]> {
    // The production SQLite adapter performs the same ordered `$n` to `?`
    // conversion. Repository statements never reuse a numbered placeholder.
    const sqliteSql = sql.replace(/\$\d+/g, '?');
    const statement = this.db.prepare(sqliteSql);
    if (statement.reader) {
      const rows = statement.all(...params) as any[];
      this.calls.push({sql, rowCount: rows.length, keys: Object.keys(rows[0] ?? {})});
      return rows;
    }
    statement.run(...params);
    this.calls.push({sql, rowCount: 0, keys: []});
    return [];
  }

  public async transaction<T>(fn: (query: StatsSql) => Promise<T>): Promise<T> {
    this.transactions++;
    this.db.exec('BEGIN');
    try {
      const result = await fn(this);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  public close(): void {
    this.db.close();
  }
}

const scoreParts = {
  tr: 10,
  cards: 20,
  greenery: 15,
  city: 5,
  milestones: 2,
  awards: 3,
  other: 0,
};

function fact(overrides: Partial<StatsGameFact> = {}): StatsGameFact {
  return {
    gameId: 'g1',
    endedAt: 1000,
    day: '1970-01-01',
    players: 2,
    generations: 12,
    ranked: true,
    board: 'Tharsis',
    cardsComplete: true,
    seats: [
      {
        seat: 0,
        accountId: 'alice',
        score: 70,
        position: 1,
        won: true,
        scoreParts,
        cards: [
          {name: 'Mining Guild', type: 'corporation', vp: 5},
          {name: 'Greenhouse', type: 'project', vp: 2},
        ],
      },
      {
        seat: 1,
        accountId: 'bob',
        score: 50,
        position: 2,
        won: false,
        scoreParts: {...scoreParts, tr: 8, cards: 15, greenery: 10, city: 4, milestones: 1, awards: 2},
        cards: [{name: 'Mining Guild', type: 'corporation', vp: 3}],
      },
    ],
    ...overrides,
  };
}

function filter(overrides: Partial<StatsCardFilter> = {}): StatsCardFilter {
  return {
    cohort: {scope: 'community', days: 30, players: 0, mode: 'all'},
    from: 0,
    to: 10000,
    type: 'corporation',
    sort: 'plays',
    minGames: 1,
    page: 1,
    ...overrides,
  };
}

describe('StatsRepository', () => {
  let db: SqliteStatsSql;
  let repository: StatsRepository;
  let now = 0;

  beforeEach(async () => {
    db = new SqliteStatsSql();
    now = 0;
    repository = new StatsRepository(db, () => now);
    await repository.initialize();
  });

  afterEach(() => {
    db.close();
  });

  it('saves idempotently, replaces child snapshots, and rolls back a failed retry', async () => {
    await repository.save(fact());
    await repository.save(fact({
      endedAt: 1100,
      seats: [fact().seats[0]],
    }));

    expect((await db.query('SELECT ended_at FROM stats_games WHERE game_id = $1', ['g1']))[0].ended_at).eq(1100);
    expect((await db.query('SELECT COUNT(*) AS count FROM stats_players WHERE game_id = $1', ['g1']))[0].count).eq(1);
    expect((await db.query('SELECT COUNT(*) AS count FROM stats_cards WHERE game_id = $1', ['g1']))[0].count).eq(2);

    const invalid = fact({
      endedAt: 1200,
      seats: [{...fact().seats[0], cards: [{name: 'Broken', type: null as any, vp: null}]}],
    });
    await expect(repository.save(invalid)).to.be.rejected;

    const game = (await db.query('SELECT ended_at FROM stats_games WHERE game_id = $1', ['g1']))[0];
    expect(game.ended_at).eq(1100);
    expect((await db.query('SELECT COUNT(*) AS count FROM stats_players WHERE game_id = $1', ['g1']))[0].count).eq(1);
    expect((await db.query('SELECT name, type FROM stats_cards WHERE game_id = $1 ORDER BY name', ['g1']))).deep.eq([
      {name: 'Greenhouse', type: 'project'},
      {name: 'Mining Guild', type: 'corporation'},
    ]);
  });

  it('uses half-open date ranges and excludes incomplete card snapshots from coverage', async () => {
    await repository.save(fact());
    await repository.save(fact({
      gameId: 'g2',
      endedAt: 2000,
      day: '1970-01-01',
      cardsComplete: false,
      generations: 20,
      seats: fact().seats.map((player) => ({...player, score: player.score + 5, cards: []})),
    }));
    await repository.save(fact({
      gameId: 'g3',
      endedAt: 3000,
      day: '1970-01-02',
      players: 1,
      ranked: false,
      board: 'Hellas',
      seats: [{...fact().seats[0], accountId: 'alice', score: 100, position: 1, cards: [{name: 'Mining Guild', type: 'corporation', vp: 8}]}],
    }));

    const rangeCallStart = db.calls.length;
    const rangeTransactionStart = db.transactions;
    const range = await repository.overview({
      cohort: {scope: 'community', days: 30, players: 0, mode: 'all'},
      from: 1000,
      to: 2000,
    });
    const rangeReadCalls = db.calls.slice(rangeCallStart);
    expect(db.transactions - rangeTransactionStart).eq(1);
    expect(rangeReadCalls.every((call) => call.rowCount <= 3)).true;
    expect(rangeReadCalls.every((call) => !/^\s*SELECT\s+[gp]\.game_id/.test(call.sql))).true;
    expect(rangeReadCalls.every((call) => !call.keys.some((key) => ['game_id', 'account_id', 'seat'].includes(key)))).true;
    expect(range.summary.games).eq(1);
    expect(range.summary.firstGameAt).eq(1000);
    expect(range.summary.lastGameAt).eq(1000);

    const allCallStart = db.calls.length;
    const allMultiplayer = await repository.overview({
      cohort: {scope: 'community', days: 30, players: 0, mode: 'all'},
      from: 0,
      to: 4000,
    });
    const allReadCalls = db.calls.slice(allCallStart);
    expect(allReadCalls.every((call) => call.rowCount <= 3)).true;
    expect(allReadCalls.every((call) => !/^\s*SELECT\s+[gp]\.game_id/.test(call.sql))).true;
    expect(allReadCalls.every((call) => !call.keys.some((key) => ['game_id', 'account_id', 'seat'].includes(key)))).true;
    expect(allMultiplayer.summary.games).eq(2);
    expect(allMultiplayer.summary.playerEntries).eq(4);
    expect(allMultiplayer.summary.cardGames).eq(1);
    expect(allMultiplayer.summary.avgCards).eq(1.5);
    expect(allMultiplayer.trend.map((row) => row.day)).deep.eq(['1970-01-01']);
    expect(allMultiplayer.distribution.find((bucket) => bucket.from === 40)?.count).eq(2);
    expect(allMultiplayer.distribution.find((bucket) => bucket.from === 60)?.count).eq(2);

    // Mining Guild appears twice in one captured game. minGames follows the
    // displayed play count, so a threshold of two includes the group.
    const cardsTransactionStart = db.transactions;
    const duplicateAppearance = await repository.cards(filter({minGames: 2}));
    expect(db.transactions - cardsTransactionStart).eq(1);
    expect(duplicateAppearance.total).eq(1);
    expect(duplicateAppearance.rows[0].plays).eq(2);

    const pageCallStart = db.calls.length;
    const outOfRange = await repository.cards(filter({page: 100}));
    const pageCalls = db.calls.slice(pageCallStart).filter((call) => call.sql.includes('WITH eligible_entries'));
    // The grouped cohort snapshot is cached; changing only the page must not
    // issue another database aggregation.
    expect(pageCalls).length(0);
    expect(outOfRange.total).eq(1);
    expect(outOfRange.rows).deep.eq([]);
  });

  it('filters personal results by normalized account, keeps denominators distinct, and groups cards by type', async () => {
    const aliceToken = 'ualice123456789';
    const aliceSessionToken = 'ualice1234567-session';
    await repository.save(fact({
      seats: fact().seats.map((player) => ({...player, accountId: player.seat === 0 ? aliceToken : player.accountId})),
    }));
    await repository.save(fact({
      gameId: 'g2',
      endedAt: 2000,
      day: '1970-01-02',
      cardsComplete: false,
      seats: fact().seats.map((player) => ({...player, accountId: player.seat === 0 ? aliceToken : null})),
    }));
    await repository.save(fact({
      gameId: 'g3',
      endedAt: 3000,
      players: 1,
      ranked: false,
      seats: [{...fact().seats[0], accountId: aliceToken, cards: [{name: 'Mining Guild', type: 'corporation', vp: 8}]}],
    }));

    const personal = await repository.overview({
      cohort: {scope: 'personal', days: 30, players: 0, mode: 'all'},
      from: 0,
      to: 4000,
      accountId: aliceSessionToken,
    });
    expect(personal.summary.games).eq(2);
    expect(personal.summary.registeredPlayers).eq(1);
    expect(personal.summary.playerEntries).eq(2);
    expect(personal.summary.cardGames).eq(1);
    expect(personal.summary.avgCards).eq(2);

    const cards = await repository.cards(filter({accountId: aliceSessionToken, cohort: {scope: 'personal', days: 30, players: 0, mode: 'all'}}));
    expect(cards.total).eq(1);
    expect(cards.pageSize).eq(30);
    expect(cards.rows[0]).include({name: 'Mining Guild', type: 'corporation', plays: 1, eligibleEntries: 1, playRate: 100});
    expect(cards.rows[0].expectedWinRate).eq(50);
    expect(cards.rows[0].lift).eq(50);

    const project = await repository.cards(filter({type: 'project'}));
    expect(project.total).eq(1);
    expect(project.rows[0].name).eq('Greenhouse');
    expect(project.rows[0].eligibleEntries).eq(2);
    expect(project.rows[0].playRate).eq(50);
  });

  it('sorts average position ascending with deterministic name ties', async () => {
    const makeFact = (gameId: string, positions: [number, number]): StatsGameFact => fact({
      gameId,
      endedAt: gameId === 'position-a' ? 1000 : 2000,
      seats: fact().seats.map((player, index) => ({
        ...player,
        position: positions[index] as number,
        cards: [
          {name: index === 0 ? 'Beta' : 'Alpha', type: 'corporation', vp: 1},
          ...(index === 0 ? [{name: gameId === 'position-a' ? 'Zeta' : 'Aardvark', type: 'corporation' as const, vp: 1}] : []),
        ],
      })),
    });
    await repository.save(makeFact('position-a', [1, 2]));
    await repository.save(makeFact('position-b', [2, 1]));

    const result = await repository.cards(filter({sort: 'avgPosition'}));
    expect(result.rows.map((row) => [row.name, row.avgPosition])).deep.eq([
      ['Zeta', 1],
      ['Alpha', 1.5],
      ['Beta', 1.5],
      ['Aardvark', 2],
    ]);
  });

  it('caps page size at 30 and preserves totals for later pages', async () => {
    const cards = Array.from({length: 35}, (_, index) => ({
      name: `Card ${String(index).padStart(2, '0')}`,
      type: 'corporation' as const,
      vp: index,
    }));
    await repository.save(fact({
      seats: fact().seats.map((player, index) => ({...player, cards: index === 0 ? cards : []})),
    }));

    const firstPage = await repository.cards(filter({page: 1, pageSize: 6, sort: 'avgPosition'}));
    expect(firstPage.total).eq(35);
    expect(firstPage.pageSize).eq(6);
    expect(firstPage.rows).length(6);
    expect(firstPage.rows[0].name).eq('Card 00');

    const secondPage = await repository.cards(filter({page: 2, pageSize: 6, sort: 'avgPosition'}));
    expect(secondPage.total).eq(35);
    expect(secondPage.rows[0].name).eq('Card 06');

    const capped = await repository.cards(filter({page: 1, pageSize: 999, sort: 'avgPosition'}));
    expect(capped.pageSize).eq(30);
    expect(capped.rows).length(30);
  });

  it('shares the all-type aggregate snapshot across pages and isolates cohorts', async () => {
    await repository.save(fact());
    const start = db.calls.length;
    const base = filter({pageSize: 6, sort: 'plays'});
    await Promise.all([
      repository.cards(base),
      repository.cards({...base, type: 'project', sort: 'avgPosition', page: 2, minGames: 2}),
      repository.cards({...base, type: 'prelude', pageSize: 12}),
      repository.cards({...base, type: 'ceo', sort: 'winRate', page: 3}),
    ]);
    const aggregateCalls = () => db.calls.slice(start).filter((call) => call.sql.includes('WITH eligible_entries'));
    expect(aggregateCalls()).length(1);

    await repository.cards({...base, cohort: {...base.cohort, mode: 'ranked'}});
    expect(aggregateCalls()).length(2);
    await repository.cards({...base, cohort: {...base.cohort, scope: 'personal'}, accountId: 'alice'});
    expect(aggregateCalls()).length(3);
    const bob = await repository.cards({...base, cohort: {...base.cohort, scope: 'personal'}, accountId: 'bob'});
    expect(aggregateCalls()).length(4);
    expect(bob.rows[0].avgPosition).eq(2);

    now = 60_001;
    await repository.cards(base);
    expect(aggregateCalls()).length(5);
  });

  it('returns null expected win rate for solo cards and has date/account indexes', async () => {
    await repository.save(fact({
      gameId: 'solo',
      endedAt: 5000,
      players: 1,
      ranked: false,
      seats: [{...fact().seats[0], cards: [{name: 'Solo Corp', type: 'corporation', vp: null}]}],
    }));

    const solo = await repository.cards(filter({
      cohort: {scope: 'community', days: 30, players: 1, mode: 'casual'},
      minGames: 1,
    }));
    expect(solo.rows[0].winRate).eq(100);
    expect(solo.rows[0].expectedWinRate).eq(null);
    expect(solo.rows[0].lift).eq(null);
    expect(solo.rows[0].avgCardVp).eq(null);

    const datePlan = await db.query('EXPLAIN QUERY PLAN SELECT game_id FROM stats_games WHERE ended_at >= $1 AND ended_at < $2', [0, 10000]);
    expect(JSON.stringify(datePlan)).contains('stats_games_ended_at_idx');
    const accountPlan = await db.query('EXPLAIN QUERY PLAN SELECT game_id FROM stats_players WHERE account_id = $1 AND game_id = $2', ['alice', 'solo']);
    expect(JSON.stringify(accountPlan)).contains('stats_players_account_game_idx');
  });
});
