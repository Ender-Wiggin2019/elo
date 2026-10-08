<template>
  <div class="portal-empty-state">
    <p class="portal-empty-state__title" v-i18n>{{ title }}</p>
    <p v-if="description" class="portal-empty-state__description" v-i18n>{{ description }}</p>
    <div v-if="$slots.default" class="portal-empty-state__actions"><slot /></div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';

export default defineComponent({
  name: 'PortalEmptyState',
  props: {
    title: {type: String, required: true},
    description: {type: String, default: ''},
  },
});
</script>

<style scoped>
.portal-empty-state { padding: 40px 20px; text-align: center; }
.portal-empty-state__title { margin: 0; color: var(--portal-text); font-size: 17px; font-weight: 600; line-height: 1.5; }
.portal-empty-state__description { margin: 9px 0 0; color: var(--portal-muted); font-size: 14px; line-height: 1.6; }
.portal-empty-state__actions { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
</style>
