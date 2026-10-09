<template>
  <a class="stats-card-identity" :href="cardHref" :title="$t(name)">
    <div v-if="cardModel" class="stats-card-identity__art" aria-hidden="true" inert>
      <div class="stats-card-identity__scale">
        <Card :key="name" :card="cardModel" />
      </div>
    </div>
    <span class="stats-card-identity__caption">
      <span class="stats-card-identity__name">{{ $t(name) }}</span>
      <span v-if="lowSample" class="stats-card-identity__sample" v-i18n>Low sample</span>
    </span>
  </a>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import Card from '@/client/components/card/Card.vue';
import {cardNameToHash} from '@/client/components/cardlist/CardListModel';
import {getCard} from '@/client/cards/ClientCardManifest';
import {CardName} from '@/common/cards/CardName';
import {CardModel} from '@/common/models/CardModel';

export default defineComponent({
  name: 'StatsCardIdentity',
  components: {Card},
  props: {
    name: {type: String, required: true},
    lowSample: {type: Boolean, default: false},
  },
  computed: {
    cardModel(): CardModel | undefined {
      // Historical names may no longer exist in the current card manifest.
      const card = getCard(this.name as CardName);
      return card ? {name: card.name} : undefined;
    },
    cardHref(): string {
      return `/cards${cardNameToHash(this.name)}`;
    },
  },
});
</script>

<style scoped>
.stats-card-identity { display: flex; align-items: center; gap: 12px; color: var(--portal-text); text-decoration: none; }
.stats-card-identity:hover .stats-card-identity__name { color: var(--portal-accent); text-decoration: underline; text-underline-offset: 3px; }
.stats-card-identity:focus-visible { outline: 2px solid var(--portal-accent); outline-offset: 4px; border-radius: 4px; }
.stats-card-identity__art { display: flex; align-items: center; justify-content: center; flex: 0 0 112px; width: 112px; height: 138px; overflow: hidden; pointer-events: none; }
/* Scale the existing card and its normal margins together; never override game-card styles. */
.stats-card-identity__scale { display: flow-root; zoom: .4; }
.stats-card-identity__caption { display: grid; justify-items: start; gap: 8px; min-width: 0; }
.stats-card-identity__name { font: 600 13px/1.5 Ubuntu, sans-serif; overflow-wrap: anywhere; }
.stats-card-identity__sample { display: inline-block; padding: 3px 6px; border: 1px solid rgba(245,158,11,.35); border-radius: 999px; color: #f6c86d; font: 700 9px/1.1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .04em; text-transform: uppercase; }
</style>
