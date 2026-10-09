import {StatsCardRow, StatsCardsResponse, StatsCardType, StatsOverview, StatsScorePart} from '../../common/models/StatsModel';
import {StatsCardFilter, StatsGameFact, StatsFilter, StatsPlayerFact} from './StatsTypes';
import {normalizeUserId} from '../../common/utils/normalizeUserId';
import {StatsCache} from './StatsCache';

/** Values accepted by the small SQL adapter used by the stats repository. */
export type StatsSqlParam = string | number | null;

/** A query handle. Transactions receive this narrower interface on purpose. */
export interface StatsQuery {
  query(sql: string, params?: Array<StatsSqlParam>): Promise<any[]>;
}

/**
 * Database operations needed by the analytics store.
 *
 * The application adapters translate the `$1` placeholders for SQLite and pass
 * them through unchanged for PostgreSQL. Keeping the transaction callback
 * here means save() can never accidentally mix a pool query with a client
 * query while replacing a game's child rows.
 */
export interface StatsSql extends StatsQuery {
  transaction<T>(fn: (query: StatsQuery) => Promise<T>): Promise<T>;
  readTransaction?<T>(fn: (query: StatsQuery) => Promise<T>): Promise<T>;
}

type Overview = Pick<StatsOverview, 'summary' | 'trend' | 'distribution' | 'scoreParts' | 'boards'>;

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 30;
const MAX_PAGE = 1000;
const MIN_MIN_GAMES = 1;
const MAX_MIN_GAMES = 1000;
const PLAYER_INSERT_CHUNK = 250;
const CARD_INSERT_CHUNK = 500;
const SCORE_PART_KEYS = ['tr', 'cards', 'greenery', 'city', 'milestones', 'awards', 'other'] as const;

function numberValue(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = numberValue(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function round2(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizedAccountId(accountId: string): string {
  return normalizeUserId(accountId);
}

function accountIdForStorage(accountId: string | null | undefined): string | null {
  if (accountId === null || accountId === undefined || accountId === '') {
    return null;
  }
  return normalizedAccountId(accountId);
}

function playerCountCondition(alias: string, players: number): string {
  if (players === 0) {
    return `${alias}.players >= 2`;
  }
  if (players === 1) {
    return `${alias}.players = 1`;
  }
  return `${alias}.players = ${players}`;
}

/**
 * Convert a fact filter into SQL predicates. Every value is appended once to
 * the parameter list; this is important for the simple SQLite `$n` adapter.
 */
function gamePredicates(filter: StatsFilter, params: StatsSqlParam[], gameAlias: string = 'g'): string[] {
  const predicates: string[] = [];
  predicates.push(`${gameAlias}.ended_at >= $${params.push(filter.from)}`);
  predicates.push(`${gameAlias}.ended_at < $${params.push(filter.to)}`);
  predicates.push(playerCountCondition(gameAlias, filter.cohort.players));

  if (filter.cohort.mode === 'ranked') {
    predicates.push(`${gameAlias}.ranked = 1`);
  } else if (filter.cohort.mode === 'casual') {
    predicates.push(`${gameAlias}.ranked = 0`);
  }

  if (filter.cohort.scope === 'personal') {
    if (filter.accountId === undefined || filter.accountId === null || filter.accountId === '') {
      predicates.push('1 = 0');
    } else {
      const accountId = normalizedAccountId(filter.accountId);
      // The account_id-leading index can seed this subquery before the date
      // and roster predicates are applied to stats_games.
      predicates.push(`${gameAlias}.game_id IN (
        SELECT account_player.game_id
        FROM stats_players account_player
        WHERE account_player.account_id = $${params.push(accountId)}
      )`);
    }
  }
  return predicates;
}

function playerPredicates(filter: StatsFilter, params: StatsSqlParam[], playerAlias: string = 'p'): string[] {
  if (filter.cohort.scope !== 'personal') {
    return [];
  }
  if (filter.accountId === undefined || filter.accountId === null || filter.accountId === '') {
    return ['1 = 0'];
  }
  return [`${playerAlias}.account_id = $${params.push(normalizedAccountId(filter.accountId))}`];
}

interface CardAggregate {
  name: string;
  type: StatsCardType;
  plays: number;
  wins: number;
  winRate: number;
  expectedWinRate: number | null;
  lift: number | null;
  avgScore: number;
  avgPosition: number;
  avgCardVp: number | null;
}

interface CardAggregateSnapshot {
  eligibleEntries: number;
  cards: CardAggregate[];
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareNullableDescending(a: number | null, b: number | null): number {
  if (a === null && b === null) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  return b - a;
}

function compareCardAggregates(a: CardAggregate, b: CardAggregate, sort: StatsCardFilter['sort']): number {
  let result: number;
  switch (sort) {
  case 'winRate':
    result = b.winRate - a.winRate;
    break;
  case 'lift':
    result = compareNullableDescending(a.lift, b.lift);
    break;
  case 'avgScore':
    result = b.avgScore - a.avgScore;
    break;
  case 'avgCardVp':
    result = compareNullableDescending(a.avgCardVp, b.avgCardVp);
    break;
  case 'avgPosition':
    result = a.avgPosition - b.avgPosition;
    break;
  case 'plays':
  default:
    result = b.plays - a.plays;
    break;
  }
  if (result !== 0) {
    return result;
  }
  return compareText(a.name, b.name) || compareText(a.type, b.type);
}

function rowPlaceholders(startIndex: number, width: number, count: number): string {
  let index = startIndex;
  const rows: string[] = [];
  for (let row = 0; row < count; row++) {
    const placeholders: string[] = [];
    for (let column = 0; column < width; column++) {
      placeholders.push(`$${index++}`);
    }
    rows.push(`(${placeholders.join(', ')})`);
  }
  return rows.join(', ');
}

function filteredGamesCte(filter: StatsFilter, params: StatsSqlParam[]): string {
  const where = gamePredicates(filter, params).join(' AND ');
  return `WITH filtered_games AS (
    SELECT g.game_id, g.ended_at, g.day, g.players, g.generations, g.board, g.cards_complete
    FROM stats_games g
    WHERE ${where}
  )`;
}

function filteredPlayersCte(filter: StatsFilter, params: StatsSqlParam[]): string {
  const games = filteredGamesCte(filter, params);
  const playerWhere = playerPredicates(filter, params, 'p');
  return `${games}, filtered_players AS (
    SELECT p.game_id, p.seat, p.account_id, p.score, p.position, p.won,
           p.score_tr, p.score_cards, p.score_greenery, p.score_city,
           p.score_milestones, p.score_awards, p.score_other
    FROM stats_players p
    INNER JOIN filtered_games fg ON fg.game_id = p.game_id
    WHERE ${playerWhere.length === 0 ? '1 = 1' : playerWhere.join(' AND ')}
  )`;
}

export class StatsRepository {
  private readonly cardCache: StatsCache;

  constructor(private readonly sql: StatsSql, private readonly now: () => number = Date.now) {
    // Card pages share one compact grouped snapshot per cohort. The cache is
    // deliberately small and short-lived because saves do not invalidate it.
    this.cardCache = new StatsCache(now, 16, 2);
  }

  private readSnapshot<T>(work: (query: StatsQuery) => Promise<T>): Promise<T> {
    return this.sql.readTransaction ? this.sql.readTransaction(work) : this.sql.transaction(work);
  }

  /** Create the analytics tables and the indexes used by date and account filters. */
  public async initialize(): Promise<void> {
    await this.sql.query(`
      CREATE TABLE IF NOT EXISTS stats_games (
        game_id TEXT NOT NULL,
        ended_at BIGINT NOT NULL,
        day TEXT NOT NULL,
        players INTEGER NOT NULL,
        generations INTEGER NOT NULL,
        ranked INTEGER NOT NULL,
        board TEXT NOT NULL,
        cards_complete INTEGER NOT NULL,
        PRIMARY KEY (game_id)
      )
    `);
    await this.sql.query(`
      CREATE TABLE IF NOT EXISTS stats_players (
        game_id TEXT NOT NULL,
        seat INTEGER NOT NULL,
        account_id TEXT,
        score DOUBLE PRECISION NOT NULL,
        position INTEGER NOT NULL,
        won INTEGER NOT NULL,
        score_tr DOUBLE PRECISION,
        score_cards DOUBLE PRECISION,
        score_greenery DOUBLE PRECISION,
        score_city DOUBLE PRECISION,
        score_milestones DOUBLE PRECISION,
        score_awards DOUBLE PRECISION,
        score_other DOUBLE PRECISION,
        PRIMARY KEY (game_id, seat),
        FOREIGN KEY (game_id) REFERENCES stats_games(game_id)
      )
    `);
    await this.sql.query(`
      CREATE TABLE IF NOT EXISTS stats_cards (
        game_id TEXT NOT NULL,
        seat INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        vp DOUBLE PRECISION,
        PRIMARY KEY (game_id, seat, name),
        FOREIGN KEY (game_id) REFERENCES stats_games(game_id)
      )
    `);
    await this.sql.query('CREATE INDEX IF NOT EXISTS stats_games_ended_at_idx ON stats_games(ended_at)');
    await this.sql.query('CREATE INDEX IF NOT EXISTS stats_players_account_game_idx ON stats_players(account_id, game_id)');
  }

  /**
   * Persist one completed game. Replacing child rows makes retries idempotent
   * even when the second write contains a corrected card snapshot.
   */
  public async save(fact: StatsGameFact): Promise<void> {
    await this.sql.transaction(async (query) => {
      await query.query(`
        INSERT INTO stats_games
          (game_id, ended_at, day, players, generations, ranked, board, cards_complete)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (game_id) DO UPDATE SET
          ended_at = EXCLUDED.ended_at,
          day = EXCLUDED.day,
          players = EXCLUDED.players,
          generations = EXCLUDED.generations,
          ranked = EXCLUDED.ranked,
          board = EXCLUDED.board,
          cards_complete = EXCLUDED.cards_complete
      `, [
        fact.gameId,
        fact.endedAt,
        fact.day,
        fact.players,
        fact.generations,
        fact.ranked ? 1 : 0,
        fact.board,
        fact.cardsComplete ? 1 : 0,
      ]);

      // Delete cards first so adapters with foreign-key enforcement can also
      // use this schema. Both deletes are inside the same transaction.
      await query.query('DELETE FROM stats_cards WHERE game_id = $1', [fact.gameId]);
      await query.query('DELETE FROM stats_players WHERE game_id = $1', [fact.gameId]);

      const players = fact.seats ?? [];
      for (let offset = 0; offset < players.length; offset += PLAYER_INSERT_CHUNK) {
        const chunk = players.slice(offset, offset + PLAYER_INSERT_CHUNK);
        const params: StatsSqlParam[] = [];
        for (const player of chunk) {
          const scoreParts = player.scoreParts;
          params.push(
            fact.gameId,
            player.seat,
            accountIdForStorage(player.accountId),
            player.score,
            player.position,
            player.won ? 1 : 0,
            scoreParts?.tr ?? null,
            scoreParts?.cards ?? null,
            scoreParts?.greenery ?? null,
            scoreParts?.city ?? null,
            scoreParts?.milestones ?? null,
            scoreParts?.awards ?? null,
            scoreParts?.other ?? null,
          );
        }
        await query.query(`
          INSERT INTO stats_players
            (game_id, seat, account_id, score, position, won,
             score_tr, score_cards, score_greenery, score_city,
             score_milestones, score_awards, score_other)
          VALUES ${rowPlaceholders(1, 13, chunk.length)}
        `, params);
      }

      const cards: Array<{player: StatsPlayerFact; card: StatsPlayerFact['cards'][number]}> = [];
      for (const player of players) {
        for (const card of player.cards ?? []) {
          cards.push({player, card});
        }
      }
      for (let offset = 0; offset < cards.length; offset += CARD_INSERT_CHUNK) {
        const chunk = cards.slice(offset, offset + CARD_INSERT_CHUNK);
        const params: StatsSqlParam[] = [];
        for (const {player, card} of chunk) {
          params.push(fact.gameId, player.seat, card.name, card.type, card.vp ?? null);
        }
        await query.query(`
          INSERT INTO stats_cards (game_id, seat, name, type, vp)
          VALUES ${rowPlaceholders(1, 5, chunk.length)}
        `, params);
      }
    });
  }

  /** Return outcome aggregates, score distribution, trend, score parts, and boards. */
  public async overview(filter: StatsFilter): Promise<Overview> {
    // Keep the five aggregate reads on one database snapshot. SQLite's
    // adapter uses BEGIN IMMEDIATE; the PostgreSQL adapter should use a
    // repeatable-read transaction for the same guarantee.
    return await this.readSnapshot(async (query) => {
      const summaryParams: StatsSqlParam[] = [];
      const summaryRows = await query.query(`
      ${filteredPlayersCte(filter, summaryParams)},
      card_counts AS (
        SELECT fp.game_id, fp.seat, COUNT(c.name) AS card_count
        FROM filtered_players fp
        INNER JOIN filtered_games fg ON fg.game_id = fp.game_id
        LEFT JOIN stats_cards c ON c.game_id = fp.game_id AND c.seat = fp.seat
        WHERE fg.cards_complete = 1
        GROUP BY fp.game_id, fp.seat
      )
      SELECT
        (SELECT COUNT(*) FROM filtered_games) AS games,
        (SELECT COUNT(*) FROM filtered_players) AS player_entries,
        (SELECT COUNT(DISTINCT account_id) FROM filtered_players WHERE account_id IS NOT NULL) AS registered_players,
        (SELECT SUM(CASE WHEN won = 1 THEN 1 ELSE 0 END) FROM filtered_players) AS wins,
        (SELECT AVG(score * 1.0) FROM filtered_players) AS avg_score,
        (SELECT MAX(score) FROM filtered_players) AS best_score,
        (SELECT AVG(position * 1.0) FROM filtered_players) AS avg_position,
        (SELECT AVG(generations * 1.0) FROM filtered_games) AS avg_generations,
        (SELECT AVG(card_count * 1.0) FROM card_counts) AS avg_cards,
        (SELECT COUNT(*) FROM filtered_games WHERE cards_complete = 1) AS card_games,
        (SELECT MIN(ended_at) FROM filtered_games) AS first_game_at,
        (SELECT MAX(ended_at) FROM filtered_games) AS last_game_at
    `, summaryParams) as Array<{
      games: unknown;
      player_entries: unknown;
      registered_players: unknown;
      wins: unknown;
      avg_score: unknown;
      best_score: unknown;
      avg_position: unknown;
      avg_generations: unknown;
      avg_cards: unknown;
      card_games: unknown;
      first_game_at: unknown;
      last_game_at: unknown;
    }>;
      const summaryRow = summaryRows[0] ?? {};
      const playerEntries = numberValue(summaryRow.player_entries);
      const wins = numberValue(summaryRow.wins);

      const trendParams: StatsSqlParam[] = [];
      const trendRows = await query.query(`
      ${filteredPlayersCte(filter, trendParams)}
      SELECT fg.day,
             COUNT(DISTINCT fg.game_id) AS games,
             AVG(fp.score * 1.0) AS avg_score,
             SUM(CASE WHEN fp.won = 1 THEN 1 ELSE 0 END) AS wins,
             COUNT(fp.game_id) AS player_entries
      FROM filtered_games fg
      LEFT JOIN filtered_players fp ON fp.game_id = fg.game_id
      GROUP BY fg.day
      ORDER BY fg.day ASC
      LIMIT 181
    `, trendParams) as Array<{day: unknown; games: unknown; avg_score: unknown; wins: unknown; player_entries: unknown}>;
      const trend = trendRows.map((row) => ({
        day: String(row.day),
        games: numberValue(row.games),
        avgScore: round2(numberValue(row.avg_score)),
        wins: numberValue(row.wins),
        playerEntries: numberValue(row.player_entries),
      }));

      const distributionParams: StatsSqlParam[] = [];
      // Scores are bounded by the game rules, so retaining every bucket avoids
      // silently dropping an overflow bucket from the distribution.
      const distributionRows = await query.query(`
      ${filteredPlayersCte(filter, distributionParams)}
      SELECT FLOOR(fp.score / 20.0) * 20 AS bucket_from, COUNT(*) AS count
      FROM filtered_players fp
      GROUP BY FLOOR(fp.score / 20.0) * 20
      ORDER BY bucket_from ASC
    `, distributionParams) as Array<{bucket_from: unknown; count: unknown}>;
      const distribution = distributionRows.map((row) => {
        const from = numberValue(row.bucket_from);
        return {from, to: from + 20, count: numberValue(row.count)};
      });

      const scorePartsParams: StatsSqlParam[] = [];
      const scorePartRows = await query.query(`
      ${filteredPlayersCte(filter, scorePartsParams)}
      SELECT AVG(score_tr * 1.0) AS avg_tr,
             AVG(score_cards * 1.0) AS avg_cards,
             AVG(score_greenery * 1.0) AS avg_greenery,
             AVG(score_city * 1.0) AS avg_city,
             AVG(score_milestones * 1.0) AS avg_milestones,
             AVG(score_awards * 1.0) AS avg_awards,
             AVG(score_other * 1.0) AS avg_other
      FROM filtered_players
    `, scorePartsParams) as Array<{
      avg_tr: unknown;
      avg_cards: unknown;
      avg_greenery: unknown;
      avg_city: unknown;
      avg_milestones: unknown;
      avg_awards: unknown;
      avg_other: unknown;
    }>;
      const scorePartRow = scorePartRows[0] ?? {};
      const scorePartValues: Record<typeof SCORE_PART_KEYS[number], unknown> = {
        tr: scorePartRow.avg_tr,
        cards: scorePartRow.avg_cards,
        greenery: scorePartRow.avg_greenery,
        city: scorePartRow.avg_city,
        milestones: scorePartRow.avg_milestones,
        awards: scorePartRow.avg_awards,
        other: scorePartRow.avg_other,
      };
      const scoreParts: StatsScorePart[] = SCORE_PART_KEYS.flatMap((key) => {
        const value = nullableNumber(scorePartValues[key]);
        return value === null ? [] : [{key, average: round2(value)}];
      });

      const boardParams: StatsSqlParam[] = [];
      const boardRows = await query.query(`
      ${filteredGamesCte(filter, boardParams)}
      SELECT board, COUNT(*) AS games, AVG(generations * 1.0) AS avg_generations
      FROM filtered_games
      GROUP BY board
      ORDER BY board ASC
      LIMIT 1000
    `, boardParams) as Array<{board: unknown; games: unknown; avg_generations: unknown}>;
      const boards = boardRows.map((row) => ({
        name: String(row.board),
        games: numberValue(row.games),
        avgGenerations: round2(numberValue(row.avg_generations)),
      }));

      return {
        summary: {
          games: numberValue(summaryRow.games),
          playerEntries,
          registeredPlayers: numberValue(summaryRow.registered_players),
          wins,
          winRate: round2(playerEntries === 0 ? 0 : wins * 100 / playerEntries),
          avgScore: round2(numberValue(summaryRow.avg_score)),
          bestScore: numberValue(summaryRow.best_score),
          avgPosition: round2(numberValue(summaryRow.avg_position)),
          avgGenerations: round2(numberValue(summaryRow.avg_generations)),
          avgCards: round2(numberValue(summaryRow.avg_cards)),
          cardGames: numberValue(summaryRow.card_games),
          firstGameAt: nullableNumber(summaryRow.first_game_at),
          lastGameAt: nullableNumber(summaryRow.last_game_at),
        },
        trend,
        distribution,
        scoreParts,
        boards,
      };
    });
  }

  private cardAggregateCacheKey(filter: StatsCardFilter): string {
    return JSON.stringify({
      scope: filter.cohort.scope,
      days: filter.cohort.days,
      players: filter.cohort.players,
      mode: filter.cohort.mode,
      accountId: filter.accountId ? normalizedAccountId(filter.accountId) : null,
      from: filter.from,
      to: filter.to,
    });
  }

  private async loadCardAggregates(filter: StatsCardFilter): Promise<CardAggregateSnapshot> {
    return await this.readSnapshot(async (query) => {
      const params: StatsSqlParam[] = [];
      const eligibleWhere = [
        ...gamePredicates(filter, params),
        'g.cards_complete = 1',
        ...playerPredicates(filter, params, 'p'),
      ].join(' AND ');
      const rows = await query.query(`
      WITH eligible_entries AS MATERIALIZED (
        SELECT g.players, p.game_id, p.seat, p.score, p.position, p.won
        FROM stats_games g
        INNER JOIN stats_players p ON p.game_id = g.game_id
        WHERE ${eligibleWhere}
      ), grouped_cards AS MATERIALIZED (
        SELECT c.name,
               c.type,
               COUNT(*) AS plays,
               SUM(CASE WHEN e.won = 1 THEN 1 ELSE 0 END) AS wins,
               CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM(CASE WHEN e.won = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) END AS win_rate,
               AVG(CASE WHEN e.players >= 2 THEN 100.0 / e.players ELSE NULL END) AS expected_win_rate,
               CASE WHEN AVG(CASE WHEN e.players >= 2 THEN 100.0 / e.players ELSE NULL END) IS NULL
                    THEN NULL
                    ELSE SUM(CASE WHEN e.won = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
                      - AVG(CASE WHEN e.players >= 2 THEN 100.0 / e.players ELSE NULL END)
               END AS lift,
               AVG(e.score * 1.0) AS avg_score,
               AVG(e.position * 1.0) AS avg_position,
               AVG(c.vp * 1.0) AS avg_card_vp
        FROM stats_cards c
        INNER JOIN eligible_entries e ON e.game_id = c.game_id AND e.seat = c.seat
        GROUP BY c.name, c.type
      ), eligible_totals AS (
        SELECT COUNT(*) AS eligible_entries
        FROM eligible_entries
      )
      SELECT grouped_cards.name,
             grouped_cards.type,
             grouped_cards.plays,
             grouped_cards.wins,
             grouped_cards.expected_win_rate,
             grouped_cards.lift,
             grouped_cards.win_rate,
             grouped_cards.avg_score,
             grouped_cards.avg_position,
             grouped_cards.avg_card_vp,
             eligible_totals.eligible_entries
      FROM eligible_totals
      LEFT JOIN grouped_cards ON TRUE
      ORDER BY grouped_cards.type ASC, grouped_cards.name ASC
    `, params) as Array<{
      name: unknown;
      type: unknown;
      plays: unknown;
      wins: unknown;
      expected_win_rate: unknown;
      lift: unknown;
      win_rate: unknown;
      avg_score: unknown;
      avg_position: unknown;
      avg_card_vp: unknown;
      eligible_entries: unknown;
    }>;

      const eligibleEntries = numberValue(rows[0]?.eligible_entries);
      const cards = rows.filter((row) => row.name !== null && row.name !== undefined).map((row) => ({
        name: String(row.name),
        type: row.type as StatsCardType,
        plays: numberValue(row.plays),
        wins: numberValue(row.wins),
        winRate: numberValue(row.win_rate),
        expectedWinRate: nullableNumber(row.expected_win_rate),
        lift: nullableNumber(row.lift),
        avgScore: numberValue(row.avg_score),
        avgPosition: numberValue(row.avg_position),
        avgCardVp: nullableNumber(row.avg_card_vp),
      }));
      return {eligibleEntries, cards};
    });
  }

  /** Group every captured card family once, then sort/filter/page in memory. */
  public async cards(filter: StatsCardFilter): Promise<StatsCardsResponse> {
    const snapshot = await this.cardCache.get(this.cardAggregateCacheKey(filter), () => this.loadCardAggregates(filter));
    const page = Math.min(MAX_PAGE, Math.max(1, Math.floor(numberValue(filter.page, 1))));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(numberValue(filter.pageSize, DEFAULT_PAGE_SIZE))));
    const minGames = Math.min(MAX_MIN_GAMES, Math.max(MIN_MIN_GAMES, Math.floor(numberValue(filter.minGames, MIN_MIN_GAMES))));
    const sort = filter.sort ?? 'avgPosition';
    const matchingCards = snapshot.cards.filter((card) => card.type === filter.type && card.plays >= minGames);
    const sortedCards = matchingCards.slice().sort((a, b) => compareCardAggregates(a, b, sort));
    const offset = (page - 1) * pageSize;
    const pageCards = sortedCards.slice(offset, offset + pageSize);
    const rows: StatsCardRow[] = pageCards.map((card) => ({
      name: card.name,
      type: card.type,
      plays: card.plays,
      eligibleEntries: snapshot.eligibleEntries,
      playRate: round2(snapshot.eligibleEntries === 0 ? 0 : card.plays * 100 / snapshot.eligibleEntries),
      wins: card.wins,
      winRate: round2(card.winRate),
      expectedWinRate: card.expectedWinRate === null ? null : round2(card.expectedWinRate),
      lift: card.lift === null ? null : round2(card.lift),
      avgScore: round2(card.avgScore),
      avgPosition: round2(card.avgPosition),
      avgCardVp: card.avgCardVp === null ? null : round2(card.avgCardVp),
    }));

    return {
      cohort: filter.cohort,
      from: filter.from,
      to: filter.to,
      generatedAt: this.now(),
      type: filter.type,
      sort,
      minGames,
      page,
      pageSize,
      total: matchingCards.length,
      rows,
    };
  }
}
