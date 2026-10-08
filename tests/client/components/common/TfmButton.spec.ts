import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import TfmButton from '@/client/components/common/TfmButton.vue';

describe('TfmButton', () => {
  it('requires an explicit submit type when used inside a form', async () => {
    const wrapper = mount(TfmButton, {slots: {default: 'Continue'}});
    expect(wrapper.attributes('type')).to.equal('button');
    await wrapper.setProps({type: 'submit'});
    expect(wrapper.attributes('type')).to.equal('submit');
    wrapper.unmount();
  });

  it('blocks repeated actions while loading and restores the action afterwards', async () => {
    const wrapper = mount(TfmButton, {props: {loading: true}, slots: {default: 'Join'}});
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).to.be.undefined;
    expect(wrapper.attributes('aria-busy')).to.equal('true');
    await wrapper.setProps({loading: false});
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).to.have.length(1);
    wrapper.unmount();
  });

  it('disables link navigation together with click events', async () => {
    const wrapper = mount(TfmButton, {props: {href: '/lobby', disabled: true}});
    expect(wrapper.element.tagName).to.equal('A');
    expect(wrapper.attributes('href')).to.be.undefined;
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).to.be.undefined;
    await wrapper.setProps({disabled: false});
    expect(wrapper.attributes('href')).to.equal('/lobby');
    wrapper.unmount();
  });
});
