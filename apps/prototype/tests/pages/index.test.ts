import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import IndexPage from '../../pages/index.vue';

describe('index page', () => {
  it('hides the welcome message at first', () => {
    const wrapper = mount(IndexPage);
    expect(wrapper.text()).not.toContain('Hello from the core layer.');
  });

  it('shows the welcome message after the button is clicked', async () => {
    const wrapper = mount(IndexPage);
    await wrapper.find('button').trigger('click');
    expect(wrapper.text()).toContain('Hello from the core layer.');
  });
});
