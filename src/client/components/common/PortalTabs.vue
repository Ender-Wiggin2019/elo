<template>
  <nav class="portal-tabs" :class="'portal-tabs--' + layout">
    <button v-for="item in items" :key="item.id" type="button" class="portal-tabs__item"
            :class="{'portal-tabs__item--active': modelValue === item.id}"
            :aria-pressed="modelValue === item.id" @click="$emit('update:modelValue', item.id)">
      <TfmIcon v-if="item.icon" :name="item.icon" :size="18" aria-hidden="true" />
      <span v-i18n>{{ item.label }}</span>
    </button>
  </nav>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';
import TfmIcon from './TfmIcon.vue';

export interface PortalTab {
  id: string | number;
  label: string;
  icon?: string;
}

export default defineComponent({
  name: 'PortalTabs',
  components: {TfmIcon},
  props: {
    items: {type: Array as PropType<PortalTab[]>, required: true},
    modelValue: {type: [String, Number], required: true},
    layout: {type: String as PropType<'horizontal' | 'sidebar'>, default: 'horizontal'},
  },
  emits: ['update:modelValue'],
});
</script>

<style scoped>
.portal-tabs {
  display: flex;
  gap: 5px;
  padding: 5px;
  border: 1px solid var(--portal-border);
  border-radius: 12px;
  background: rgba(9, 15, 25, .5);
  max-width: 100%;
  overflow-x: auto;
}
.portal-tabs__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 42px;
  flex: 1 0 auto;
  padding: 10px 18px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--portal-muted);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: color .2s, background .2s;
}
.portal-tabs__item:hover { color: var(--portal-text); background: rgba(255,255,255,.035); }
.portal-tabs__item--active { color: var(--portal-text); background: var(--portal-elevated); border-color: var(--portal-border); }
.portal-tabs__item--active .tfm-icon { color: var(--portal-accent); }
.portal-tabs__item:focus-visible { outline: 2px solid var(--portal-accent); outline-offset: -2px; }
.portal-tabs--sidebar { flex-direction: column; }
.portal-tabs--sidebar .portal-tabs__item { justify-content: flex-start; }
@media (max-width: 768px) {
  .portal-tabs--sidebar { flex-direction: row; }
  .portal-tabs--sidebar .portal-tabs__item { justify-content: center; }
}
@media (max-width: 480px) {
  .portal-tabs__item { gap: 6px; padding: 10px 8px; font-size: 12px; }
  .portal-tabs--sidebar .portal-tabs__item { flex-direction: column; gap: 5px; }
}
@media (prefers-reduced-motion: reduce) {
  .portal-tabs__item { transition: none; }
}
</style>
