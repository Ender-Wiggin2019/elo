import {flushPromises, mount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import {nextTick} from 'vue';
import StatsPage from '@/client/components/stats/StatsPage.vue';
import StatsCharts from '@/client/components/stats/StatsCharts.vue';
import * as statsApi from '@/client/components/stats/StatsApi';
import {StatsCardsQuery, StatsOverviewQuery} from '@/client/components/stats/StatsApi';
import {StatsCardsResponse, StatsOverview} from '@/common/models/StatsModel';
import {userStore} from '@/client/stores';
import {globalConfig} from '../getLocalVue';

function makeOverview(overrides: Partial<StatsOverview> = {}): StatsOverview {
  return {
    cohort: {scope: 'community', days: 14, players: 0, mode: 'all'},
    from: 1,
    to: 2,
    generatedAt: 2,
    access: {isLoggedIn: false, isVip: false, maxCommunityDays: 14, maxPersonalDays: 180},
    summary: {
      games: 3,
      playerEntries: 9,
      registeredPlayers: 4,
      wins: 3,
      winRate: 33.3,
      avgScore: 48.6,
      bestScore: 72,
      avgPosition: 1.8,
      avgGenerations: 12.2,
      avgCards: 18.1,
      cardGames: 3,
      firstGameAt: 1,
      lastGameAt: 2,
    },
    trend: [{day: '2026-10-07', games: 3, avgScore: 48.6, wins: 3, playerEntries: 9}],
    distribution: [{from: 40, to: 49, count: 2}],
    scoreParts: [{key: 'TR', average: 28}],
    boards: [{name: 'Tharsis', games: 3, avgGenerations: 12.2}],
    ...overrides,
  };
}

function makeCards(overrides: Partial<StatsCardsResponse> = {}): StatsCardsResponse {
  return {
    cohort: {scope: 'community', days: 14, players: 0, mode: 'all'},
    from: 1,
    to: 2,
    generatedAt: 2,
    type: 'corporation',
    sort: 'plays',
    minGames: 5,
    page: 1,
    pageSize: 6,
    total: 61,
    rows: [{
      name: 'Inventrix',
      type: 'corporation',
      plays: 5,
      eligibleEntries: 5,
      playRate: 55.5,
      wins: 2,
      winRate: 40,
      expectedWinRate: 33.3,
      lift: 6.7,
      avgScore: 51.2,
      avgPosition: 1.7,
      avgCardVp: null,
    }],
    ...overrides,
  };
}

function mountPage() {
  return mount(StatsPage, globalConfig);
}

describe('StatsPage', () => {
  let overviewRequest: ReturnType<typeof vi.spyOn>;
  let cardsRequest: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    userStore.logout();
    statsApi.clearStatsOverviewCache();
    overviewRequest = vi.spyOn(statsApi, 'fetchStatsOverview').mockResolvedValue(makeOverview());
    cardsRequest = vi.spyOn(statsApi, 'fetchStatsCards').mockImplementation((query: StatsCardsQuery) => Promise.resolve(makeCards({
      cohort: {scope: query.scope, days: query.days, players: query.players, mode: query.mode, userName: query.userName},
      type: query.type,
      sort: query.sort,
      minGames: query.minGames,
      page: query.page,
      pageSize: query.pageSize ?? 6,
    })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads four independently scoped card families with average finish and six rows by default', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(cardsRequest.mock.calls).to.have.length(4);
    expect(cardsRequest.mock.calls.map(([query]) => query.type)).to.deep.equal(['corporation', 'prelude', 'project', 'ceo']);
    expect(cardsRequest.mock.calls.every(([query]) => query.sort === 'avgPosition')).to.equal(true);
    expect(cardsRequest.mock.calls.every(([query]) => query.page === 1 && query.pageSize === 6)).to.equal(true);
    expect(wrapper.findAll('.stats-card-section')).to.have.length(4);
    expect(wrapper.find('h2').text()).to.not.contain('Which cards show up with stronger results?');
    wrapper.unmount();
  });

  it('reloads every card family when the shared cohort changes', async () => {
    userStore.setUser('vip-id', 'VIP');
    userStore.setVip(true);
    overviewRequest.mockImplementation((query: StatsOverviewQuery) => Promise.resolve(makeOverview({
      cohort: {scope: query.scope, days: query.days, players: query.players, mode: query.mode, userName: query.userName},
      access: {isLoggedIn: true, isVip: true, maxCommunityDays: 180, maxPersonalDays: 180},
    })));
    const wrapper = mountPage();
    await flushPromises();
    const initialCardsCalls = cardsRequest.mock.calls.length;

    await wrapper.find('#stats-days').setValue('30');
    await flushPromises();
    expect(overviewRequest.mock.calls.at(-1)?.[0]).to.include({days: 30});
    expect(cardsRequest.mock.calls.length).to.equal(initialCardsCalls + 4);
    expect(cardsRequest.mock.calls.slice(-4).every(([query]) => query.days === 30)).to.equal(true);
    wrapper.unmount();
  });

  it('ignores a stale overview response after the cohort changes', async () => {
    userStore.setUser('user-id', 'Commander');
    let resolveFirst!: (value: StatsOverview) => void;
    overviewRequest.mockImplementationOnce(() => new Promise<StatsOverview>((resolve) => {
      resolveFirst = resolve;
    }));
    overviewRequest.mockResolvedValueOnce(makeOverview({cohort: {scope: 'personal', days: 14, players: 0, mode: 'all'}, summary: {...makeOverview().summary, games: 8}}));

    const wrapper = mountPage();
    await wrapper.findAll('.portal-tabs__item').at(1).trigger('click');
    await flushPromises();
    resolveFirst(makeOverview());
    await flushPromises();

    expect(wrapper.find('.stats-snapshot-date').text()).to.contain('Personal');
    expect(wrapper.find('.stats-kpi__value').text()).to.equal('8');
    wrapper.unmount();
  });

  it('keeps an overview error recoverable and mounts card sections after retry', async () => {
    overviewRequest.mockRejectedValueOnce(new Error('数据库暂不可用')).mockResolvedValueOnce(makeOverview({summary: {...makeOverview().summary, games: 4}}));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.portal-empty-state__title').text()).to.equal('Unable to load statistics');
    await wrapper.find('.portal-empty-state__actions button').trigger('click');
    await flushPromises();

    expect(wrapper.find('.portal-empty-state').exists()).to.equal(false);
    expect(wrapper.find('.stats-kpi__value').text()).to.equal('4');
    expect(wrapper.findAll('.stats-card-section')).to.have.length(4);
    wrapper.unmount();
  });

  it('prompts for login for personal self stats while allowing public name search', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.findAll('.portal-tabs__item').at(1).trigger('click');
    await flushPromises();

    expect(wrapper.find('.portal-empty-state__title').text()).to.equal('Sign in to view your personal statistics');
    expect(overviewRequest.mock.calls.length).to.equal(1);
    await wrapper.find('#stats-user-name').setValue('PublicPlayer');
    await wrapper.find('#stats-mode').setValue('ranked');
    await flushPromises();
    expect(overviewRequest.mock.calls.length).to.equal(1);
    await wrapper.find('form.stats-filter-form').trigger('submit');
    await flushPromises();
    expect(overviewRequest.mock.calls.at(-1)?.[0]).to.include({scope: 'personal', mode: 'ranked', userName: 'PublicPlayer'});
    expect(cardsRequest.mock.calls.slice(-4).every(([query]) => query.userName === 'PublicPlayer')).to.equal(true);
    wrapper.unmount();
  });

  it('pages a single card family without reloading the overview', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const overviewCalls = overviewRequest.mock.calls.length;
    const cardsCalls = cardsRequest.mock.calls.length;

    await wrapper.findAll('.stats-card-section').at(0)!.find('.stats-table-pagination button:last-child').trigger('click');
    await flushPromises();

    expect(overviewRequest.mock.calls.length).to.equal(overviewCalls);
    expect(cardsRequest.mock.calls.length).to.equal(cardsCalls + 1);
    expect(cardsRequest.mock.calls.at(-1)?.[0]).to.include({type: 'corporation', page: 2});
    wrapper.unmount();
  });

  it('resets each card section controls and page with the shared filters', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const corporation = wrapper.findAll('.stats-card-section').at(0)!;

    await corporation.find('#stats-card-sort-corporation').setValue('lift');
    await flushPromises();
    await corporation.find('#stats-card-min-games-corporation').setValue('10');
    await flushPromises();
    await corporation.find('#stats-card-page-size-corporation').setValue('12');
    await flushPromises();
    await corporation.find('.stats-table-pagination button:last-child').trigger('click');
    await flushPromises();
    expect(corporation.find('.stats-table-page-number').text()).to.equal('2');

    await wrapper.find('.stats-reset-button').trigger('click');
    await flushPromises();
    const resetCorporation = wrapper.findAll('.stats-card-section').at(0)!;
    expect((resetCorporation.find('#stats-card-sort-corporation').element as HTMLSelectElement).value).to.equal('avgPosition');
    expect((resetCorporation.find('#stats-card-min-games-corporation').element as HTMLSelectElement).value).to.equal('5');
    expect((resetCorporation.find('#stats-card-page-size-corporation').element as HTMLSelectElement).value).to.equal('6');
    expect(resetCorporation.find('.stats-table-page-number').text()).to.equal('1');
    expect(cardsRequest.mock.calls.slice(-4).some(([query]) => query.type === 'corporation' && query.sort === 'avgPosition' && query.minGames === 5 && query.page === 1 && query.pageSize === 6)).to.equal(true);
    wrapper.unmount();
  });

  it('formats API percentages as 0 to 100 values in the page', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect((wrapper.vm as any).formatPercent(0.5)).to.equal('0.5%');
    expect((wrapper.vm as any).formatPercent(1)).to.equal('1.0%');
    wrapper.unmount();
  });

  it('clamps a personal 180 day selection before switching to community', async () => {
    userStore.setUser('user-id', 'Commander');
    overviewRequest.mockImplementation((query: StatsOverviewQuery) => Promise.resolve(makeOverview({
      cohort: {scope: query.scope, days: query.scope === 'personal' ? 180 : query.days, players: query.players, mode: query.mode, userName: query.userName},
      access: {isLoggedIn: true, isVip: false, maxCommunityDays: 14, maxPersonalDays: 180},
    })));
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.findAll('.portal-tabs__item').at(1).trigger('click');
    await flushPromises();
    expect((wrapper.vm as any).draft.days).to.equal(180);

    await wrapper.findAll('.portal-tabs__item').at(0).trigger('click');
    await flushPromises();
    expect(overviewRequest.mock.calls.at(-1)?.[0]).to.include({scope: 'community', days: 14});
    expect((wrapper.vm as any).draft.days).to.equal(14);
    wrapper.unmount();
  });

  it('does not apply a typed player name until the search is submitted', async () => {
    userStore.setUser('user-id', 'Commander');
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.findAll('.portal-tabs__item').at(1).trigger('click');
    await flushPromises();

    await wrapper.find('#stats-user-name').setValue('DraftPlayer');
    expect((wrapper.vm as any).overviewStale).to.equal(false);
    expect(cardsRequest.mock.calls.at(-1)?.[0].userName).to.equal(undefined);
    await wrapper.find('form.stats-filter-form').trigger('submit');
    await flushPromises();
    expect(overviewRequest.mock.calls.at(-1)?.[0]).to.include({userName: 'DraftPlayer'});
    wrapper.unmount();
  });

  it('clears the committed overview and remounts card sections when the account changes', async () => {
    userStore.setUser('user-a', 'Alpha');
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.findAll('.stats-card-section')).to.have.length(4);

    overviewRequest.mockImplementation(() => new Promise<StatsOverview>(() => undefined));
    userStore.setUser('user-b', 'Beta');
    await nextTick();

    expect((wrapper.vm as any).overview).to.equal(null);
    expect(wrapper.findAll('.stats-card-section')).to.have.length(0);
    wrapper.unmount();
  });

  it('initializes personal draft state from the supported URL parameters', async () => {
    window.history.replaceState({}, '', '/stats?scope=personal&userName=Public%20Player');
    const wrapper = mountPage();

    expect((wrapper.vm as any).draft).to.include({scope: 'personal', days: 14, players: 0, mode: 'all', userName: 'Public Player'});
    expect((wrapper.vm as any).appliedUserName).to.equal('Public Player');
    await flushPromises();
    wrapper.unmount();
    window.history.replaceState({}, '', '/');
  });

  it('fills missing UTC days in the activity chart and preserves negative composition values', () => {
    const overview = makeOverview({
      from: Date.UTC(2026, 9, 1),
      to: Date.UTC(2026, 9, 4),
      trend: [{day: '2026-10-02', games: 2, avgScore: 40, wins: 1, playerEntries: 4}],
      scoreParts: [{key: 'other', average: -4}],
    });
    const wrapper = mount(StatsCharts, {...globalConfig, props: {overview}});
    expect((wrapper.vm as any).dailyTrend.map((point: {day: string}) => point.day)).to.deep.equal(['2026-10-01', '2026-10-02', '2026-10-03']);
    expect((wrapper.vm as any).scorePartStyle(-4)).to.include({right: '50%', width: '50%'});
    wrapper.unmount();
  });
});
