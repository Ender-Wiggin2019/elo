import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import StatsCardIdentity from '@/client/components/stats/StatsCardIdentity.vue';
import {hashToModel} from '@/client/components/cardlist/CardListModel';
import {getCardOrThrow} from '@/client/cards/ClientCardManifest';
import {CardName} from '@/common/cards/CardName';
import {globalConfig} from '../getLocalVue';

describe('StatsCardIdentity', () => {
  for (const [name, selector] of [
    [CardName.BIRDS, '.background-color-active'],
    [CardName.CREDICOR, '.corporation-label'],
    [CardName.ALLIED_BANK, '.prelude-label'],
    [CardName.KAREN, '.ceo-label'],
  ]) {
    it(`renders the existing card face for ${name}`, () => {
      const wrapper = mount(StatsCardIdentity, {...globalConfig, props: {name}});

      expect(wrapper.find('.card-container').exists()).to.equal(true);
      expect(wrapper.find(selector).exists()).to.equal(true);
      expect(wrapper.find('.stats-card-identity__name').text()).to.equal(name);
      const destination = new URL(wrapper.attributes('href'), 'http://localhost');
      const filters = hashToModel(destination.hash);
      const card = getCardOrThrow(name as CardName);
      expect(destination.pathname).to.equal('/cards');
      expect(filters.filterText).to.equal(name);
      expect(filters.expansions[card.module]).to.equal(true);
      expect(filters.types[card.type]).to.equal(true);
      // Thumbnail help controls must not intercept the containing detail link.
      expect(wrapper.find('.stats-card-identity__art').attributes('inert')).to.equal('');
      wrapper.unmount();
    });
  }

  it('preserves the name and detail link when a historical card has no current renderer', () => {
    const name = 'Retired card & variant';
    const wrapper = mount(StatsCardIdentity, {...globalConfig, props: {name, lowSample: true}});

    expect(wrapper.find('.card-container').exists()).to.equal(false);
    expect(wrapper.find('.stats-card-identity__art').exists()).to.equal(false);
    expect(wrapper.find('.stats-card-identity__name').text()).to.equal(name);
    const destination = new URL(wrapper.attributes('href'), 'http://localhost');
    expect(hashToModel(destination.hash).filterText).to.equal(name);
    expect(wrapper.find('.stats-card-identity__sample').text()).to.equal('Low sample');
    wrapper.unmount();
  });

  it('recreates the card renderer when a reused identity changes card', async () => {
    const wrapper = mount(StatsCardIdentity, {...globalConfig, props: {name: CardName.CREDICOR}});
    await wrapper.setProps({name: CardName.ALLIED_BANK});

    expect(wrapper.find('.corporation-label').exists()).to.equal(false);
    expect(wrapper.find('.prelude-label').exists()).to.equal(true);
    wrapper.unmount();
  });
});
