<template>
  <header class="portal-page-header">
    <div class="portal-page-header__copy">
      <h1 class="portal-heading" v-i18n>{{ title }}</h1>
      <div v-if="$slots.default" class="portal-page-header__description"><slot /></div>
    </div>
    <div v-if="$slots.actions" class="portal-page-header__actions"><slot name="actions" /></div>
  </header>
</template>

<script lang="ts">
import {defineComponent} from 'vue';

export default defineComponent({
  name: 'PortalPageHeader',
  props: {title: {type: String, required: true}},
});
</script>

<style scoped>
.portal-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px 24px;
  margin-bottom: 28px;
}
.portal-page-header__copy { min-width: 0; }
.portal-page-header .portal-heading { margin: 0; overflow-wrap: anywhere; }
.portal-page-header__description { margin-top: 9px; color: var(--portal-muted); font-size: 14px; line-height: 1.6; }
.portal-page-header__actions { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
@media (max-width: 480px) {
  .portal-page-header { align-items: flex-start; }
}
</style>
