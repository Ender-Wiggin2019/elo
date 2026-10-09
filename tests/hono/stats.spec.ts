import {expect} from 'chai';
import {createStatsRoutes} from '../../src/server/hono/stats';
import {StatsOverview} from '../../src/common/models/StatsModel';
import {StatsFilter} from '../../src/server/stats/StatsTypes';
import {User} from '../../src/server/User';
import {StatsCache} from '../../src/server/stats/StatsCache';

describe('Statistics access and query boundaries', () => {
  const now = Date.UTC(2026, 9, 8, 12, 0, 25);
  const normal = new User('普通玩家', '', 'u123456789012');
  const vip = new User('VIP 玩家', '', 'u987654321098');
  normal.tokenList = [normal.id + 't-valid'];
  vip.tokenList = [vip.id + 't-valid'];
  const empty: Pick<StatsOverview, 'summary' | 'trend' | 'distribution' | 'scoreParts' | 'boards'> = {
    summary: {games: 0, playerEntries: 0, registeredPlayers: 0, wins: 0, winRate: 0, avgScore: 0, bestScore: 0, avgPosition: 0, avgGenerations: 0, avgCards: 0, cardGames: 0, firstGameAt: null, lastGameAt: null},
    trend: [], distribution: [], scoreParts: [], boards: [],
  };
  let filters: StatsFilter[];
  let routes: ReturnType<typeof createStatsRoutes>;
  beforeEach(() => {
    filters = [];
    vip.vipDate = '9999-01-01';
    normal.vipDate = '2000-01-01';
    routes = createStatsRoutes({
      now: () => now,
      userByToken: async (token) => [normal, vip].find((user) => user.tokenList.includes(token) || user.id === token),
      userByName: async (name) => [normal, vip].find((user) => user.name === name),
      repository: () => ({
        overview: async (filter) => {
          filters.push(filter); return empty;
        },
        cards: async (filter) => {
          filters.push(filter);
          return {...filter, cohort: filter.cohort, generatedAt: now, rows: [], total: 0, pageSize: 30};
        },
      }),
    });
  });
  const auth = (user: User) => ({headers: {Authorization: 'Bearer ' + user.tokenList[0]}});

  it('defaults to the last 14 days and returns no account identifiers', async () => {
    const response = await routes.request('/overview');
    expect(response.status).eq(200);
    expect(response.headers.get('cache-control')).eq('private, no-store');
    const body = await response.json();
    expect(body.cohort.days).eq(14);
    expect(body.to - body.from).eq(14 * 86_400_000);
    expect(body.to).eq(now - 25_000);
    expect(body.access.maxCommunityDays).eq(14);
    expect(JSON.stringify(body)).not.match(/accountId|userId|tokenList|ownerId/);
  });

  it('defaults card pages to average position and accepts bounded page sizes', async () => {
    const response = await routes.request('/cards?page=2&pageSize=6');
    expect(response.status).eq(200);
    const body = await response.json();
    expect(body.sort).eq('avgPosition');
    expect(body.page).eq(2);
    expect(body.pageSize).eq(6);
    expect(filters).length(1);
    expect((filters[0] as any).sort).eq('avgPosition');
    expect((filters[0] as any).pageSize).eq(6);
  });

  it('rejects non-VIP extended community requests for both endpoints before querying', async () => {
    for (const endpoint of ['overview', 'cards']) {
      expect((await routes.request(`/${endpoint}?days=30`)).status).eq(403);
      expect((await routes.request(`/${endpoint}?days=180`, auth(normal))).status).eq(403);
    }
    expect(filters).length(0);
  });

  it('allows VIP 180 days, caps the maximum, and rechecks VIP status before cache hits', async () => {
    expect((await routes.request('/overview?days=180', auth(vip))).status).eq(200);
    expect((await routes.request('/cards?days=180', auth(vip))).status).eq(200);
    expect((await routes.request('/overview?days=181', auth(vip))).status).eq(400);
    vip.vipDate = '2000-01-01';
    expect((await routes.request('/overview?days=180', auth(vip))).status).eq(403);
    expect(filters).length(2);
  });

  it('rejects expired tokens, bare account IDs, forged flags and malformed filters', async () => {
    for (const token of [normal.id, normal.id + 't-forged']) {
      expect((await routes.request('/overview', {headers: {Authorization: 'Bearer ' + token}})).status).eq(401);
    }
    for (const query of ['days=all', 'days=-14', 'days=14&days=180', 'days=14.5', 'players=7', 'mode=oops', 'isVip=true', 'from=0', 'scope=oops', 'userId=' + vip.id]) {
      expect((await routes.request('/overview?' + query)).status, query).eq(400);
    }
    for (const query of ['page=1001', 'page=0', 'pageSize=31', 'pageSize=0', 'minGames=1001', 'minGames=0', 'sort=score;DROP', 'type=unknown']) {
      expect((await routes.request('/cards?' + query)).status, query).eq(400);
    }
    expect(filters).length(0);
  });

  it('uses verified self identity or a resolved public name for personal queries', async () => {
    expect((await routes.request('/overview?scope=personal')).status).eq(401);
    const self = await routes.request('/overview?scope=personal&days=180', auth(normal));
    expect(self.status).eq(200);
    expect(filters[0].accountId).eq(normal.id);
    expect((await self.json()).cohort.userName).eq(normal.name);
    const named = await routes.request('/overview?scope=personal&userName=' + encodeURIComponent(vip.name));
    expect(named.status).eq(200);
    expect(filters[1].accountId).eq(vip.id);
    expect((await named.text())).not.include(vip.id);
    expect((await routes.request('/overview?scope=personal&userName=missing')).status).eq(404);
  });

  it('deduplicates requests but keeps personal and community cache entries separate', async () => {
    await Promise.all([routes.request('/overview'), routes.request('/overview')]);
    expect(filters).length(1);
    await routes.request('/overview?scope=personal', auth(normal));
    await routes.request('/overview?scope=personal', auth(vip));
    expect(filters).length(3);
  });
});

describe('Statistics query cache', () => {
  it('bounds concurrent queries, shares in-flight work, retries failures and expires results', async () => {
    let now = 0;
    const cache = new StatsCache(() => now, 2, 1);
    let finish!: (value: number) => void;
    const pending = new Promise<number>((resolve) => {
      finish = resolve;
    });
    const first = cache.get('a', () => pending);
    const same = cache.get('a', async () => 999);
    try {
      await cache.get('b', async () => 2);
      expect.fail('Expected backpressure');
    } catch (err: any) {
      expect(err.statusCode).eq(503);
    }
    finish(1);
    expect(await first).eq(1);
    expect(await same).eq(1);
    now = 61_000;
    expect(await cache.get('a', async () => 3)).eq(3);
    try {
      await cache.get('bad', async () => {
        throw new Error('retry');
      });
    } catch (_) { /* expected */ }
    expect(await cache.get('bad', async () => 4)).eq(4);
  });
});
