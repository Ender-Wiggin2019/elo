/** Public analytics contracts. No account identifiers or login tokens leave the server. */
export const STATS_RANGES = [7, 14, 30, 90, 180] as const;
export type StatsDays = typeof STATS_RANGES[number];
export type StatsScope = 'community' | 'personal';
export type StatsCardType = 'corporation' | 'prelude' | 'project' | 'ceo';
export type StatsMode = 'all' | 'ranked' | 'casual';
export type StatsCardSort = 'plays' | 'winRate' | 'lift' | 'avgScore' | 'avgCardVp' | 'avgPosition';

export interface StatsCohort {
  scope: StatsScope;
  days: StatsDays;
  /** 0 = multiplayer (2+); 1 = solo; otherwise exact player count. */
  players: number;
  mode: StatsMode;
  userName?: string;
}

export interface StatsSummary {
  games: number;
  playerEntries: number;
  registeredPlayers: number;
  wins: number;
  winRate: number;
  avgScore: number;
  bestScore: number;
  avgPosition: number;
  avgGenerations: number;
  avgCards: number;
  /** Games with a captured final tableau (historical imports may lack one). */
  cardGames: number;
  firstGameAt: number | null;
  lastGameAt: number | null;
}

export interface StatsScorePart {
  key: string;
  average: number;
}

export interface StatsOverview {
  cohort: StatsCohort;
  from: number;
  to: number;
  generatedAt: number;
  access: {isLoggedIn: boolean; isVip: boolean; maxCommunityDays: number; maxPersonalDays: number};
  summary: StatsSummary;
  trend: Array<{day: string; games: number; avgScore: number; wins: number; playerEntries: number}>;
  distribution: Array<{from: number; to: number; count: number}>;
  scoreParts: StatsScorePart[];
  boards: Array<{name: string; games: number; avgGenerations: number}>;
}

export interface StatsCardRow {
  name: string;
  type: StatsCardType;
  plays: number;
  /** Number of eligible player appearances with a complete card snapshot. */
  eligibleEntries: number;
  playRate: number;
  wins: number;
  winRate: number;
  /** Average 1 / player count, excluding solo (null for solo). */
  expectedWinRate: number | null;
  lift: number | null;
  avgScore: number;
  avgPosition: number;
  avgCardVp: number | null;
}

export interface StatsCardsResponse {
  cohort: StatsCohort;
  from: number;
  to: number;
  generatedAt: number;
  type: StatsCardType;
  sort: StatsCardSort;
  minGames: number;
  page: number;
  pageSize: number;
  total: number;
  rows: StatsCardRow[];
}
