import {flushPromises, mount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import StatsCardSection from '@/client/components/stats/StatsCardSection.vue';
import * as statsApi from '@/client/components/stats/StatsApi';
import {StatsCardsQuery} from '@/client/components/stats/StatsApi';
import {StatsCardsResponse} from '@/common/models/StatsModel';
import {globalConfig} from '../getLocalVue';

const cohort = {scope: 'community' as const, days: 14 as const, players: 0, mode: 'all' as const};

function makeCards(overrides: Partial<StatsCardsResponse> = {}): StatsCardsResponse {
  return {
    cohort,
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

function makeResponse(query: StatsCardsQuery, overrides: Partial<StatsCardsResponse> = {}): StatsCardsResponse {
  return makeCards({
    cohort: {scope: query.scope, days: query.days, players: query.players, mode: query.mode, userName: query.userName},
    type: query.type,
    sort: query.sort,
    minGames: query.minGames,
    page: query.page,
    pageSize: query.pageSize ?? 6,
    ...overrides,
  });
}

function mountSection() {
  return mount(StatsCardSection, {
    ...globalConfig,
    props: {title: 'Corporations', type: 'corporation', cohort},
  });
}

describe('StatsCardSection', () => {
  let cardsRequest: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cardsRequest = vi.spyOn(statsApi, 'fetchStatsCards').mockImplementation((query: StatsCardsQuery) => Promise.resolve(makeResponse(query)));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses average finish ascending and six rows by default, with independent controls', async () => {
    const wrapper = mountSection();
    await flushPromises();

    expect(cardsRequest.mock.calls[0][0]).to.include({type: 'corporation', sort: 'avgPosition', minGames: 5, page: 1, pageSize: 6});
    expect(wrapper.find('#stats-card-sort-corporation').findAll('option').map((option) => option.text())).to.include('Average finish (ascending)');

    await wrapper.find('#stats-card-sort-corporation').setValue('lift');
    await flushPromises();
    expect(cardsRequest.mock.calls.at(-1)?.[0]).to.include({type: 'corporation', sort: 'lift', page: 1, pageSize: 6});

    await wrapper.find('#stats-card-page-size-corporation').setValue('12');
    await flushPromises();
    expect(cardsRequest.mock.calls.at(-1)?.[0]).to.include({sort: 'lift', page: 1, pageSize: 12});
    wrapper.unmount();
  });

  it('keeps the committed page and rows while a new page is in flight', async () => {
    const wrapper = mountSection();
    await flushPromises();
    let resolvePage!: (value: StatsCardsResponse) => void;
    cardsRequest.mockImplementationOnce(() => new Promise<StatsCardsResponse>((resolve) => {
      resolvePage = resolve;
    }));

    await wrapper.find('.stats-table-pagination button:last-child').trigger('click');
    await wrapper.vm.$nextTick();
    expect(cardsRequest.mock.calls.at(-1)?.[0]).to.include({page: 2, pageSize: 6});
    expect(wrapper.find('.stats-table-page-number').text()).to.equal('1');
    expect(wrapper.find('.stats-section-stale').exists()).to.equal(false);
    expect(wrapper.find('.stats-refreshing').exists()).to.equal(true);
    expect(wrapper.findAll('.stats-card-table__name').at(1)?.text()).to.contain('Inventrix');

    resolvePage(makeCards({page: 2}));
    await flushPromises();
    expect(wrapper.find('.stats-table-page-number').text()).to.equal('2');
    wrapper.unmount();
  });

  it('keeps the committed page and total after a failed page request and retries the target', async () => {
    const wrapper = mountSection();
    await flushPromises();
    cardsRequest.mockRejectedValueOnce(new Error('卡牌分页暂不可用'));

    await wrapper.find('.stats-table-pagination button:last-child').trigger('click');
    await flushPromises();
    expect(wrapper.find('.stats-table-page-number').text()).to.equal('1');
    expect(wrapper.find('.stats-table-page-copy').text()).to.contain('1–6 of 61');
    expect(wrapper.findAll('.stats-card-table__name').at(1)?.text()).to.contain('Inventrix');
    expect(wrapper.find('.stats-table-error').text()).to.contain('卡牌分页暂不可用');
    expect(wrapper.find('.stats-section-stale').exists()).to.equal(true);

    cardsRequest.mockResolvedValueOnce(makeCards({page: 2}));
    await wrapper.find('.stats-table-error button').trigger('click');
    await flushPromises();
    expect(cardsRequest.mock.calls.at(-1)?.[0].page).to.equal(2);
    expect(wrapper.find('.stats-table-page-number').text()).to.equal('2');
    wrapper.unmount();
  });

  it('marks old rows stale when a sort request fails', async () => {
    const wrapper = mountSection();
    await flushPromises();
    cardsRequest.mockRejectedValueOnce(new Error('排序暂不可用'));

    await wrapper.find('#stats-card-sort-corporation').setValue('avgScore');
    await flushPromises();
    expect(wrapper.find('#stats-card-sort-corporation').element).to.have.property('value', 'avgScore');
    expect(wrapper.findAll('.stats-card-table__name').at(1)?.text()).to.contain('Inventrix');
    expect(wrapper.find('.stats-section-stale').exists()).to.equal(true);
    expect(wrapper.find('.stats-table-error').text()).to.contain('排序暂不可用');
    wrapper.unmount();
  });

  it('requests the new cohort while retaining the previous section snapshot', async () => {
    const wrapper = mountSection();
    await flushPromises();
    let resolveCohort!: (value: StatsCardsResponse) => void;
    cardsRequest.mockImplementationOnce(() => new Promise<StatsCardsResponse>((resolve) => {
      resolveCohort = resolve;
    }));

    await wrapper.setProps({cohort: {...cohort, players: 3}});
    await wrapper.vm.$nextTick();
    expect(cardsRequest.mock.calls.at(-1)?.[0]).to.include({players: 3, page: 1});
    expect(wrapper.findAll('.stats-card-table__name').at(1)?.text()).to.contain('Inventrix');
    expect(wrapper.find('.stats-section-stale').exists()).to.equal(false);
    expect(wrapper.find('.stats-refreshing').exists()).to.equal(true);
    resolveCohort(makeCards({cohort: {...cohort, players: 3}}));
    await flushPromises();
    wrapper.unmount();
  });
});
