import {StatsCardType, StatsCohort, StatsCardSort} from '../../common/models/StatsModel';
import {GameOptions} from '../game/GameOptions';
import {Score} from '../IGame';

/** Internal persisted facts; accountId is normalized and is never serialized to clients. */
export interface StatsGameFact {
  gameId: string;
  endedAt: number;
  day: string;
  players: number;
  generations: number;
  ranked: boolean;
  board: string;
  /** false means only historical outcomes, without a final card tableau. */
  cardsComplete: boolean;
  seats: StatsPlayerFact[];
}

export interface StatsPlayerFact {
  seat: number;
  accountId: string | null;
  score: number;
  position: number;
  won: boolean;
  /** Missing historical VP breakdown remains null, never fabricated as zero. */
  scoreParts: {tr: number; cards: number; greenery: number; city: number; milestones: number; awards: number; other: number} | null;
  cards: Array<{name: string; type: StatsCardType; vp: number | null}>;
}

export interface StatsFilter {
  cohort: StatsCohort;
  from: number;
  to: number;
  accountId?: string;
}

export interface StatsCardFilter extends StatsFilter {
  type: StatsCardType;
  sort: StatsCardSort;
  minGames: number;
  page: number;
  pageSize?: number;
}

/** Bounded, offline backfill source. Never returned through HTTP. */
export interface StatsLegacyResult {
  gameId: string;
  createdAt: string;
  players: number;
  generations: number;
  gameOptions: GameOptions;
  scores: Score[];
  outcomes: Array<{accountId: string; position: number; phase: string}>;
}

export interface StatsBackfillCursor {createdAt: string; gameId: string}
