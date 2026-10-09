import {expect} from 'chai';
import {vi} from 'vitest';
import {userStore} from '@/client/stores';
import {request} from '@/client/utils/request';
import {clearStatsOverviewCache, fetchStatsCards, fetchStatsOverview} from '@/client/components/stats/StatsApi';
import {StatsCardSort} from '@/common/models/StatsModel';

describe('StatsApi', () => {
  afterEach(() => {
    userStore.logout();
    clearStatsOverviewCache();
    vi.restoreAllMocks();
  });

  it('passes the authenticated user as a bearer header and preserves a JSON error message', async () => {
    userStore.setUser('login-token', 'Commander');
    const raw = vi.spyOn(request, 'raw').mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => JSON.stringify({error: '统计范围需要 VIP 权限'}),
    } as Response);

    let error: unknown;
    try {
      await fetchStatsOverview({scope: 'community', days: 180, players: 0, mode: 'all'});
    } catch (caught) {
      error = caught;
    }

    expect(raw.mock.calls.length).to.equal(1);
    const options = raw.mock.calls[0][1] as {headers?: Record<string, string>};
    expect((options.headers as Record<string, string>).Authorization).to.equal('Bearer login-token');
    expect(String((error as Error).message)).to.equal('统计范围需要 VIP 权限');
  });

  it('bounds successful overview entries and does not cache failed responses', async () => {
    const raw = vi.spyOn(request, 'raw').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '{}',
    } as Response);

    for (let index = 0; index < 33; index++) {
      await fetchStatsOverview({scope: 'personal', days: 14, players: 0, mode: 'all', userName: `player-${index}`});
    }
    expect(raw.mock.calls.length).to.equal(33);
    await fetchStatsOverview({scope: 'personal', days: 14, players: 0, mode: 'all', userName: 'player-0'});
    expect(raw.mock.calls.length).to.equal(34);

    clearStatsOverviewCache();
    raw.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Unavailable',
      text: async () => JSON.stringify({error: '统计暂不可用'}),
    } as Response);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await fetchStatsOverview({scope: 'community', days: 14, players: 0, mode: 'all'});
      } catch (_error) {
        // A failed response must remain retryable.
      }
    }
    expect(raw.mock.calls.length).to.equal(36);
  });

  it('sends the selected card family, ascending finish sort, and compact page size', async () => {
    const raw = vi.spyOn(request, 'raw').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify({rows: [], total: 0, page: 1, pageSize: 6}),
    } as Response);

    await fetchStatsCards({
      scope: 'community',
      days: 14,
      players: 0,
      mode: 'all',
      type: 'prelude',
      sort: 'avgPosition' as StatsCardSort,
      minGames: 5,
      page: 1,
      pageSize: 6,
    });

    expect(raw.mock.calls[0][0]).to.contain('type=prelude');
    expect(raw.mock.calls[0][0]).to.contain('sort=avgPosition');
    expect(raw.mock.calls[0][0]).to.contain('pageSize=6');
  });
});
