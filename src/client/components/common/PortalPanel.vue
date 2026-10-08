<template>
  <section class="portal-panel portal-surface" :class="'portal-surface--' + padding">
    <header v-if="$slots.header" class="portal-surface__header"><slot name="header" /></header>
    <div class="portal-surface__body"><slot /></div>
    <footer v-if="$slots.footer" class="portal-surface__footer"><slot name="footer" /></footer>
  </section>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';

export default defineComponent({
  name: 'PortalPanel',
  props: {
    padding: {type: String as PropType<'normal' | 'compact' | 'none'>, default: 'normal'},
  },
});
</script>

<style scoped>
.portal-surface {
  --panel-padding: 24px;
  min-width: 0;
}
.portal-surface--compact { --panel-padding: 16px; }
.portal-surface--none { --panel-padding: 0px; }
.portal-surface__body { min-width: 0; padding: var(--panel-padding); }
.portal-surface__header,
.portal-surface__footer { padding: 18px 24px; }
.portal-surface__header { border-bottom: 1px solid var(--portal-border); }
.portal-surface__footer { border-top: 1px solid var(--portal-border); }
@media (max-width: 480px) {
  .portal-surface { --panel-padding: 18px; }
  .portal-surface--compact { --panel-padding: 14px; }
  .portal-surface--none { --panel-padding: 0px; }
  .portal-surface__header,
  .portal-surface__footer { padding: 16px 18px; }
}
</style>
