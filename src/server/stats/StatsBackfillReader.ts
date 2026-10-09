import {normalizeUserId} from '../../common/utils/normalizeUserId';
import {StatsQuery} from './StatsRepository';
import {StatsBackfillCursor, StatsLegacyResult} from './StatsTypes';

/** Only used by the explicit backfill command, never on page requests/startup. */
export class StatsBackfillReader {
  private ready: Promise<void> | undefined;

  constructor(private readonly sql: StatsQuery, private readonly postgres: boolean) {}

  async read(since: string, cursor?: StatsBackfillCursor, limit: number = 20): Promise<StatsLegacyResult[]> {
    if (!this.ready) {
      this.ready = this.prepare().catch((err) => {
        this.ready = undefined;
        throw err;
      });
    }
    await this.ready;
    const params: Array<string | number> = [since];
    const after = cursor ? `AND (r.createtime, r.game_id) > ($${params.push(cursor.createdAt)}, $${params.push(cursor.gameId)})` : '';
    const rows = await this.sql.query(`
      SELECT r.game_id, CAST(r.createtime AS TEXT) AS created_at, r.players, r.generations, r.game_options, r.scores
      FROM game_results r
      WHERE r.createtime >= $1 ${after}
        AND NOT EXISTS (SELECT 1 FROM stats_games s WHERE s.game_id = r.game_id)
      ORDER BY r.createtime, r.game_id
      LIMIT $${params.push(Math.max(1, Math.min(50, Math.floor(limit))))}`, params);
    if (rows.length === 0) {
      return [];
    }
    const outcomes = await this.sql.query(`
      SELECT game_id, user_id, position, phase FROM user_game_results
      WHERE game_id IN (${rows.map((_, i) => '$' + (i + 1)).join(',')})`, rows.map((row) => row.game_id));
    return rows.map((row) => ({
      gameId: row.game_id,
      createdAt: row.created_at,
      players: Number(row.players),
      generations: Number(row.generations),
      gameOptions: typeof row.game_options === 'string' ? JSON.parse(row.game_options) : row.game_options,
      scores: typeof row.scores === 'string' ? JSON.parse(row.scores) : row.scores,
      outcomes: outcomes.filter((outcome) => outcome.game_id === row.game_id).map((outcome) => ({
        accountId: normalizeUserId(outcome.user_id), position: Number(outcome.position), phase: outcome.phase,
      })),
    }));
  }

  private async prepare(): Promise<void> {
    // PostgreSQL builds legacy indexes online. New stats-table indexes are tiny
    // on first boot; these potentially large legacy indexes are opt-in here.
    const concurrently = this.postgres ? 'CONCURRENTLY ' : '';
    await this.sql.query(`CREATE INDEX ${concurrently}IF NOT EXISTS game_results_stats_time_idx ON game_results(createtime, game_id)`);
    await this.sql.query(`CREATE INDEX ${concurrently}IF NOT EXISTS user_game_results_stats_game_idx ON user_game_results(game_id)`);
  }
}
