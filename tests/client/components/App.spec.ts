import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import App from '@/client/components/App.vue';

describe('App', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(App, globalConfig);
    expect(wrapper.exists()).to.be.true;
  });

  it('uses the responsive portal only outside gameplay and the card catalogue', async () => {
    const viewport = document.createElement('meta');
    viewport.name = 'viewport';
    document.head.appendChild(viewport);
    const wrapper = shallowMount(App, globalConfig);

    try {
      for (const screen of ['start-screen', 'login', 'game-lobby', 'create-game-form', 'ranks', 'admin']) {
        await wrapper.setData({screen});
        expect(wrapper.classes()).to.include('portal-shell');
        expect(viewport.content).to.equal('width=device-width, initial-scale=1');
      }
      for (const screen of ['cards', 'game-home', 'player-home', 'the-end']) {
        await wrapper.setData({screen});
        expect(wrapper.classes()).not.to.include('portal-shell');
        expect(viewport.content).to.equal('width=1260, user-scalable=1');
      }
      await wrapper.setData({screen: 'me-page'});
      expect(viewport.content).to.equal('width=device-width, initial-scale=1');
    } finally {
      wrapper.unmount();
      viewport.remove();
    }
  });
});
