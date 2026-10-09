import {expect} from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import BetterSqlite3 = require('better-sqlite3');
import {SQLite} from '../../src/server/database/SQLite';
import {StatsSqliteReader} from '../../src/server/stats/statsSqliteReader';
import {StatsGameFact} from '../../src/server/stats/StatsTypes';
import {Phase} from '../../src/common/Phase';
import {DEFAULT_GAME_OPTIONS} from '../../src/server/game/GameOptions';

class StatsTestDatabase extends SQLite {
  public execute(sql: string, params: unknown[] = []) {
    return this.db.prepare(sql).run(params);
  }
}

describe('Statistics database integration', () => {
  it('reads file-backed facts on a worker and preserves idempotent snapshots', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'elo-stats-'));
    const filename = path.join(directory, 'game.db');
    const database = new StatsTestDatabase(filename);
    await database.initialize();
    const time = Date.UTC(2026, 9, 8);
    const fact: StatsGameFact = {
      gameId: 'g1', endedAt: time, day: '2026-10-08', players: 2, generations: 10, ranked: false, board: 'Tharsis', cardsComplete: true,
      seats: [0, 1].map((seat) => ({seat, accountId: null, score: 80 - seat, position: seat + 1, won: seat === 0, scoreParts: null, cards: [{name: 'Birds', type: 'project', vp: 4}]})),
    };
    const repository = database.getStatsRepository();
    await repository.save(fact);
    await repository.save(fact);
    const filter = {cohort: {scope: 'community' as const, days: 14 as const, players: 0, mode: 'all' as const}, from: time - 1, to: time + 1};
    const overview = await repository.overview(filter);
    expect(overview.summary.games).eq(1);
    expect(overview.summary.playerEntries).eq(2);
    const cards = await repository.cards({...filter, type: 'project', sort: 'plays', minGames: 1, page: 1});
    expect(cards.rows[0].plays).eq(2);
    expect(cards.rows[0].winRate).eq(50);
    const connection = new BetterSqlite3(filename, {readonly: true});
    expect(connection.pragma('journal_mode', {simple: true})).eq('wal');
    connection.close();
    fs.rmSync(directory, {recursive: true, force: true});
  });

  it('uses a stable legacy time cursor, excludes imported games and normalizes outcome IDs', async () => {
    const database = new StatsTestDatabase(':memory:');
    await database.initialize();
    const score = {corporation: 'Ecoline', playerScore: 90, player: 'Player', userId: 'u123456789012token'};
    for (const id of ['g1', 'g2', 'g3']) {
      database.saveGameResults(id, 2, 10, DEFAULT_GAME_OPTIONS, [score]);
      database.saveUserGameResult(score.userId, id, Phase.END, score, 2, 10, '2026-10-01', 1, false, undefined);
      database.execute('UPDATE game_results SET createtime = ? WHERE game_id = ?', ['2026-10-08 12:00:00', id]);
    }
    const first = await database.getStatsBackfillBatch('2026-10-01', undefined, 2);
    expect(first.map((row) => row.gameId)).deep.eq(['g1', 'g2']);
    expect(first[0].outcomes[0].accountId).eq('u123456789012');
    const next = await database.getStatsBackfillBatch('2026-10-01', {createdAt: first[1].createdAt, gameId: first[1].gameId}, 2);
    expect(next.map((row) => row.gameId)).deep.eq(['g3']);
    const plan = database['db'].prepare('EXPLAIN QUERY PLAN SELECT game_id FROM game_results WHERE createtime >= ? ORDER BY createtime, game_id LIMIT 20').all('2026-10-01');
    expect(JSON.stringify(plan)).include('game_results_stats_time_idx');
  });

  it('keeps the game event loop responsive and recovers after a failed read', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'elo-stats-reader-'));
    const filename = path.join(directory, 'game.db');
    new BetterSqlite3(filename).close();
    const reader = new StatsSqliteReader(filename);
    let timerFired = false;
    let settled = false;
    const timer = setTimeout(() => {
      timerFired = true;
    }, 10);
    const query = reader.readTransaction(async (sql) => sql.query('WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<1000000) SELECT SUM(x) AS total FROM n'));
    void query.then(() => {
      settled = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(timerFired).eq(true);
    expect(settled).eq(false);
    expect((await query)[0].total).eq(500000500000);
    try {
      await reader.readTransaction((sql) => sql.query('SELECT missing_column FROM missing_table'));
    } catch (_) { /* expected */ }
    expect((await reader.readTransaction((sql) => sql.query('SELECT 1 AS value')))[0].value).eq(1);
    clearTimeout(timer);
    reader.stop();
    fs.rmSync(directory, {recursive: true, force: true});
  });
});
