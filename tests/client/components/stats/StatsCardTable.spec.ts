import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import StatsCardTable from '@/client/components/stats/StatsCardTable.vue';
import {globalConfig} from '../getLocalVue';

describe('StatsCardTable', () => {
  it('formats API percentages as values from 0 to 100', () => {
    const wrapper = mount(StatsCardTable, {
      ...globalConfig,
      props: {rows: [], total: 0, page: 1, pageSize: 6},
    });

    expect((wrapper.vm as any).formatPercent(0.5)).to.equal('0.5%');
    expect((wrapper.vm as any).formatPercent(1)).to.equal('1.0%');
    wrapper.unmount();
  });
});
