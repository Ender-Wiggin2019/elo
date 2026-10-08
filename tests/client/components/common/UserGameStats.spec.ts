import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import UserGameStats from '@/client/components/common/UserGameStats.vue';
import {GameStatsBlock} from '@/client/services/types';
import {globalConfig} from '../getLocalVue';

describe('UserGameStats', () => {
  it('switches all displayed statistics together with the selected period', async () => {
    const allTime: GameStatsBlock = {
      totalGames: 100, wins: 60, losses: 40, winRate: 60, fleeCount: 0, fleeRate: 0,
      avgScore: 90, avgPosition: 2, totalRankGames: 80, rankWins: 50,
    };
    const recent3Months = {...allTime, totalGames: 20, wins: 5, losses: 15, winRate: 25, totalRankGames: 10, rankWins: 3};
    const wrapper = mount(UserGameStats, {...globalConfig, props: {allTime, recent3Months}});
    expect(wrapper.findAll('.ugs-hero__value')[0].text()).to.equal('60%');
    expect(wrapper.findAll('.ugs-cell__value')[0].text()).to.equal('100');
    await wrapper.findAll('.portal-tabs__item')[1].trigger('click');
    expect(wrapper.findAll('.ugs-hero__value')[0].text()).to.equal('25%');
    expect(wrapper.findAll('.ugs-cell__value')[0].text()).to.equal('20');
    expect(wrapper.find('.portal-tabs__item[aria-pressed="true"]').text()).to.equal('Last 3 Months');
    wrapper.unmount();
  });
});
