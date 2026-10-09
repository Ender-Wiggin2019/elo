import {Context, Hono} from 'hono';
import {STATS_RANGES, StatsCardSort, StatsCardType, StatsCardsResponse, StatsCohort, StatsDays, StatsMode, StatsOverview, StatsScope} from '../../common/models/StatsModel';
import {normalizeUserId} from '../../common/utils/normalizeUserId';
import {Database} from '../database/Database';
import {GameLoader} from '../database/GameLoader';
import {User} from '../User';
import {ServiceError} from '../services/ServiceError';
import {StatsCache} from '../stats/StatsCache';
import {StatsRepository} from '../stats/StatsRepository';
import {StatsFilter} from '../stats/StatsTypes';

interface StatsDependencies {
  repository: () => Pick<StatsRepository, 'overview' | 'cards'>;
  userByToken: (token: string) => Promise<User | undefined>;
  userByName: (name: string) => Promise<User | undefined>;
  now: () => number;
}

function choice<T extends string>(value: string | undefined, fallback: T, options: readonly T[]): T {
  if (value === undefined) {
    return fallback;
  }
  if (!options.includes(value as T)) {
    throw new ServiceError(400, '无效的统计筛选条件');
  }
  return value as T;
}

function integer(value: string | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined) {
    return fallback;
  }
  if (!/^\d+$/.test(value)) {
    throw new ServiceError(400, '统计参数必须为整数');
  }
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < min || result > max) {
    throw new ServiceError(400, '统计参数超出范围');
  }
  return result;
}

/** Authorization is rechecked before every cache lookup, including VIP expiry/revocation. */
export function createStatsRoutes(deps: StatsDependencies): Hono {
  const routes = new Hono();
  const cache = new StatsCache(deps.now);
  routes.use('*', async (c, next) => {
    // Authenticated responses must never enter a browser, proxy, or CDN shared cache.
    c.header('Cache-Control', 'private, no-store');
    c.header('Vary', 'Authorization');
    await next();
  });
  routes.onError((err, c) => {
    if (err instanceof ServiceError) {
      if (err.statusCode === 503) {
        c.header('Retry-After', '5');
      }
      return c.json({error: err.message}, err.statusCode as 400 | 401 | 403 | 404 | 503);
    }
    console.error('[stats] Query failed', err);
    return c.json({error: '统计暂时无法加载，请稍后重试'}, 500);
  });

  async function parse(c: Context, cards: boolean): Promise<{filter: StatsFilter; access: StatsOverview['access']}> {
    const allowed = ['scope', 'days', 'players', 'mode', 'userName', ...(cards ? ['type', 'sort', 'minGames', 'page', 'pageSize'] : [])];
    for (const [key, values] of Object.entries(c.req.queries())) {
      if (!allowed.includes(key) || values.length !== 1) {
        throw new ServiceError(400, '未知或重复的统计参数');
      }
    }
    const q = c.req.query();
    const scope = choice<StatsScope>(q.scope, 'community', ['community', 'personal']);
    const days = integer(q.days, 14, 1, 180) as StatsDays;
    if (!STATS_RANGES.includes(days)) {
      throw new ServiceError(400, '不支持此时间范围');
    }
    const players = integer(q.players, 0, 0, 6);
    const mode = choice<StatsMode>(q.mode, 'all', ['all', 'ranked', 'casual']);
    const authorization = c.req.header('Authorization');
    let viewer: User | undefined;
    if (authorization) {
      const token = /^Bearer (\S{1,512})$/i.exec(authorization)?.[1];
      viewer = token ? await deps.userByToken(token) : undefined;
      if (!token || !viewer?.checkToken(token)) {
        throw new ServiceError(401, '登录已过期，请重新登录');
      }
    }
    const access = {isLoggedIn: Boolean(viewer), isVip: Boolean(viewer?.isvip()), maxCommunityDays: viewer?.isvip() ? 180 : 14, maxPersonalDays: 180};
    if (scope === 'community' && days > access.maxCommunityDays) {
      throw new ServiceError(403, 'VIP 可查看超过 14 天、最多 180 天的全体数据');
    }
    const cohort: StatsCohort = {scope, days, players, mode};
    let accountId: string | undefined;
    if (scope === 'personal') {
      const name = q.userName?.trim();
      if (name && name.length > 80) {
        throw new ServiceError(400, '玩家名称过长');
      }
      const target = name ? await deps.userByName(name) : viewer;
      if (!target) {
        throw new ServiceError(name ? 404 : 401, name ? '找不到该玩家' : '请先登录，或按玩家名称查询');
      }
      accountId = normalizeUserId(target.id);
      cohort.userName = target.name;
    } else if (q.userName !== undefined) {
      throw new ServiceError(400, '全体统计不能指定玩家');
    }
    // A shared minute boundary gives identical requests stable query/cache keys.
    const to = Math.floor(deps.now() / 60_000) * 60_000;
    return {filter: {cohort, accountId, from: to - days * 86_400_000, to}, access};
  }

  routes.get('/overview', async (c) => {
    const {filter, access} = await parse(c, false);
    const data = await cache.get('overview:' + JSON.stringify(filter), () => deps.repository().overview(filter));
    return c.json<StatsOverview>({...data, cohort: filter.cohort, from: filter.from, to: filter.to, generatedAt: filter.to, access});
  });

  routes.get('/cards', async (c) => {
    const {filter} = await parse(c, true);
    const type = choice<StatsCardType>(c.req.query('type'), 'corporation', ['corporation', 'prelude', 'project', 'ceo']);
    const sort = choice<StatsCardSort>(c.req.query('sort'), 'avgPosition', ['plays', 'winRate', 'lift', 'avgScore', 'avgCardVp', 'avgPosition']);
    const minGames = integer(c.req.query('minGames'), 5, 1, 1000);
    const page = integer(c.req.query('page'), 1, 1, 1000);
    const pageSize = integer(c.req.query('pageSize'), 30, 1, 30);
    const cardFilter = {...filter, type, sort, minGames, page, pageSize};
    const data = await deps.repository().cards(cardFilter);
    return c.json<StatsCardsResponse>({...data, cohort: filter.cohort, from: filter.from, to: filter.to, generatedAt: filter.to, type, sort, minGames, page, pageSize});
  });
  return routes;
}

export const statsRoutes = createStatsRoutes({
  repository: () => Database.getInstance().getStatsRepository(),
  userByToken: (token) => GameLoader.getInstance().getUserById(token),
  userByName: (name) => GameLoader.getInstance().getUserByName(name),
  now: Date.now,
});
