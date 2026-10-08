import {flushPromises, mount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import Me from '@/client/components/Me.vue';
import {userService} from '@/client/services';
import {userStore} from '@/client/stores';
import {globalConfig} from './getLocalVue';

const profile = {
  id: 'test-user',
  name: 'Commander',
  createtime: '2024-01-01T00:00:00.000Z',
  isvip: 0,
  rank: null,
  totalGames: 1,
  gameStats: {
    allTime: {totalGames: 1, wins: 1, losses: 0, winRate: 100, fleeCount: 0, fleeRate: 0, avgScore: 50, avgPosition: 1, totalRankGames: 1, rankWins: 1},
    recent3Months: {totalGames: 1, wins: 1, losses: 0, winRate: 100, fleeCount: 0, fleeRate: 0, avgScore: 50, avgPosition: 1, totalRankGames: 1, rankWins: 1},
  },
};

const emptyProfile = {...profile, gameStats: null};

function mountMe() {
  return mount(Me, {
    ...globalConfig,
    global: {
      ...globalConfig.global,
      stubs: {
        ConfirmDialog: true,
        PortalPageHeader: true,
        PortalTabs: true,
        RankBadge: true,
        UserGameStats: true,
        UserIdentity: true,
      },
    },
  });
}

describe('Me', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    userStore.setUser('test-user', 'Commander');
    vi.spyOn(userService, 'getMyGames').mockResolvedValue({mygames: [], showhandcards: false});
    vi.spyOn(userService, 'getUserRankInstance').mockResolvedValue({userId: '', points: 0} as any);
  });

  afterEach(() => {
    userStore.logout();
    vi.restoreAllMocks();
  });

  it('shows a retry action after stats fail, blocks duplicate retries, and clears the error on success', async () => {
    let resolveRetry!: (value: typeof profile) => void;
    const retryResponse = new Promise<typeof profile>((resolve) => {
      resolveRetry = resolve;
    });
    const getProfile = vi.spyOn(userService, 'getUserProfile')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(profile as any)
      .mockReturnValueOnce(retryResponse as any);
    const wrapper = mountMe();
    await flushPromises();
    await wrapper.setData({activeSection: 'stats'});

    expect(wrapper.find('.portal-empty-state__title').text()).to.equal('Unable to load game stats');
    const retry = wrapper.find('.portal-empty-state__actions button');
    expect(retry.exists()).to.be.true;

    await retry.trigger('click');
    expect(retry.attributes('aria-busy')).to.equal('true');
    await retry.trigger('click');
    expect(getProfile.mock.calls).to.have.length(3);

    resolveRetry(profile);
    await flushPromises();
    expect((wrapper.vm as any).statsError).to.equal('');
    expect(wrapper.find('.portal-empty-state').exists()).to.be.false;
    wrapper.unmount();
  });

  it('shows an empty state when the profile has no game stats', async () => {
    vi.spyOn(userService, 'getUserProfile')
      .mockResolvedValue(emptyProfile as any);
    const wrapper = mountMe();
    await flushPromises();
    await wrapper.setData({activeSection: 'stats'});

    expect(wrapper.find('.portal-empty-state__title').text()).to.equal('No game stats yet');
    expect(wrapper.find('.portal-empty-state__actions').exists()).to.be.false;
    wrapper.unmount();
  });
});
