import {userStore} from '@/client/stores';
import {request} from '@/client/utils/request';
import {
  StatsCardSort,
  StatsCardType,
  StatsCardsResponse,
  StatsDays,
  StatsMode,
  StatsOverview,
  StatsScope,
} from '@/common/models/StatsModel';

export interface StatsOverviewQuery {
  scope: StatsScope;
  days: StatsDays;
  players: number;
  mode: StatsMode;
  userName?: string;
}

export interface StatsCardsQuery extends StatsOverviewQuery {
  type: StatsCardType;
  sort: StatsCardSort;
  minGames: number;
  page: number;
  pageSize?: number;
}

/**
 * A server error is intentionally kept separate from RequestError. The stats
 * endpoint returns a useful JSON `error` message which the page should show to
 * the user instead of exposing a generic HTTP status.
 */
export class StatsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'StatsApiError';
  }
}

interface OverviewCacheEntry {
  expiresAt: number;
  value: StatsOverview;
}

const OVERVIEW_CACHE_TTL_MS = 60_000;
const MAX_OVERVIEW_CACHE_ENTRIES = 32;
const overviewCache = new Map<string, OverviewCacheEntry>();

function evictExpiredOverviewCache(now: number): void {
  for (const [key, entry] of overviewCache) {
    if (entry.expiresAt <= now) {
      overviewCache.delete(key);
    }
  }
}

function evictOverviewCache(now: number): void {
  evictExpiredOverviewCache(now);
  while (overviewCache.size >= MAX_OVERVIEW_CACHE_ENTRIES) {
    const oldest = overviewCache.keys().next().value as string | undefined;
    if (oldest === undefined) {
      break;
    }
    overviewCache.delete(oldest);
  }
}

function encodeQuery(query: Record<string, string | number | undefined>): string {
  return Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

function toOverviewParams(query: StatsOverviewQuery): Record<string, string | number | undefined> {
  return {
    scope: query.scope,
    days: query.days,
    players: query.players,
    mode: query.mode,
    userName: query.userName?.trim() || undefined,
  };
}

function toCardsParams(query: StatsCardsQuery): Record<string, string | number | undefined> {
  return {
    ...toOverviewParams(query),
    type: query.type,
    sort: query.sort,
    minGames: query.minGames,
    page: query.page,
    pageSize: query.pageSize,
  };
}

function buildUrl(path: string, params: Record<string, string | number | undefined>): string {
  const encoded = encodeQuery(params);
  return encoded.length > 0 ? `${path}?${encoded}` : path;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {Accept: 'application/json'};
  if (userStore.userId) {
    headers.Authorization = `Bearer ${userStore.userId}`;
  }
  return headers;
}

async function readPayload(response: Response): Promise<unknown> {
  const body = await response.text().catch(() => '');
  if (!body) {
    return undefined;
  }
  try {
    return JSON.parse(body) as unknown;
  } catch (_error) {
    return body;
  }
}

function payloadError(payload: unknown, response: Response): string {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const error = (payload as {error?: unknown}).error;
    if (typeof error === 'string' && error.trim().length > 0) {
      return error;
    }
  }
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return payload;
  }
  return response.statusText || `HTTP ${response.status}`;
}

async function getJson<T>(path: string, params: Record<string, string | number | undefined>, signal?: AbortSignal): Promise<T> {
  const response = await request.raw(buildUrl(path, params), {
    method: 'GET',
    headers: authHeaders(),
    signal,
  });
  const payload = await readPayload(response);
  if (!response.ok) {
    throw new StatsApiError(payloadError(payload, response), response.status);
  }
  return payload as T;
}

function cacheKey(query: StatsOverviewQuery): string {
  return JSON.stringify({
    query: {...query, userName: query.userName?.trim() || undefined},
    userId: userStore.userId,
    isVip: userStore.isVip,
  });
}

/** Fetch a public or personal overview, using a short-lived per-cohort cache. */
export async function fetchStatsOverview(query: StatsOverviewQuery, signal?: AbortSignal): Promise<StatsOverview> {
  const key = cacheKey(query);
  const now = Date.now();
  evictExpiredOverviewCache(now);
  const cached = overviewCache.get(key);
  if (cached !== undefined && cached.expiresAt > now) {
    return cached.value;
  }
  if (cached !== undefined) {
    overviewCache.delete(key);
  }

  const value = await getJson<StatsOverview>('/api/v2/stats/overview', toOverviewParams(query), signal);
  evictOverviewCache(Date.now());
  overviewCache.set(key, {expiresAt: Date.now() + OVERVIEW_CACHE_TTL_MS, value});
  return value;
}

/** Fetch only the selected card family and one server-side page of rows. */
export function fetchStatsCards(query: StatsCardsQuery, signal?: AbortSignal): Promise<StatsCardsResponse> {
  return getJson<StatsCardsResponse>('/api/v2/stats/cards', toCardsParams(query), signal);
}

/** Useful for deterministic tests and for auth changes during a long-lived page. */
export function clearStatsOverviewCache(): void {
  overviewCache.clear();
}
