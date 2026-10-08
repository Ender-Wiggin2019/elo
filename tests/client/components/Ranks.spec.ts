import {flushPromises, shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import {globalConfig} from './getLocalVue';
import Ranks from '@/client/components/Ranks.vue';
import {seasonService} from '@/client/services';
import {LeaderboardResponse} from '@/client/services/types';
import {RankTiers} from '@/common/rank/RankTiers';

const season = {seasonId: 'current', seasonName: 'Current season', startDate: '', endDate: ''};
const previous = {...season, seasonId: 'previous', seasonName: 'Previous season'};
const commander = {userName: 'Commander', userTier: RankTiers[0]};

describe('Ranks', () => {
  beforeEach(() => {
    vi.spyOn(seasonService, 'getSeasonInfo').mockResolvedValue({...season, seasons: [season, previous]});
    vi.spyOn(seasonService, 'getSeasonList').mockResolvedValue({currentSeasonId: 'current', previousSeasonId: 'previous'});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps loading separate from empty and displays a leaderboard with fewer than three players', async () => {
    let resolve!: (response: LeaderboardResponse) => void;
    vi.spyOn(seasonService, 'getLeaderboard').mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    const wrapper = shallowMount(Ranks, globalConfig);
    await flushPromises();
    expect(wrapper.find('.ranks-loading').exists()).to.be.true;
    expect(wrapper.find('.ranks-empty-state').exists()).to.be.false;

    resolve({allUserRanks: [commander], seasonId: 'current', isCurrentSeason: true});
    await flushPromises();
    expect(wrapper.find('.ranks-loading').exists()).to.be.false;
    expect(wrapper.find('.ranks-table__name').text()).to.equal('Commander');
    expect(wrapper.find('.ranks-empty-state').exists()).to.be.false;
    wrapper.unmount();
  });

  it('preserves the displayed season after an error and retries the requested season', async () => {
    const load = vi.spyOn(seasonService, 'getLeaderboard')
      .mockResolvedValueOnce({allUserRanks: [commander], seasonId: 'current', isCurrentSeason: true})
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({allUserRanks: [{...commander, userName: 'Previous commander'}], seasonId: 'previous', isCurrentSeason: false});
    const wrapper = shallowMount(Ranks, globalConfig);
    await flushPromises();

    await wrapper.findAll('.ranks-season-switcher button')[1].trigger('click');
    await flushPromises();
    expect(wrapper.find('.ranks-error').exists()).to.be.true;
    expect(wrapper.find('.ranks-season-name').text()).to.equal('Current season');
    expect(wrapper.find('.ranks-table__name').text()).to.equal('Commander');

    await wrapper.find('.ranks-error button').trigger('click');
    await flushPromises();
    expect(load.mock.calls[2][0]).to.equal('previous');
    expect(wrapper.find('.ranks-error').exists()).to.be.false;
    expect(wrapper.find('.ranks-season-name').text()).to.equal('Previous season');
    expect(wrapper.find('.ranks-table__name').text()).to.equal('Previous commander');
    wrapper.unmount();
  });
});
