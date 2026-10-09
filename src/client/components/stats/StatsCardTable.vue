<template>
  <PortalPanel padding="none" class="stats-cards-panel">
    <template #header>
      <div class="stats-table-heading">
        <slot name="header"></slot>
        <div class="stats-table-heading__meta">
          <span v-if="refreshing" class="stats-refreshing" role="status" v-i18n>Updating…</span>
          <span v-if="total > 0" class="stats-table-count">{{ total }} <span v-i18n>cards</span></span>
          <span v-if="eligibleEntries > 0" class="stats-table-denominator">{{ formatInteger(eligibleEntries) }} <span v-i18n>eligible player entries</span></span>
        </div>
      </div>
    </template>

    <div v-if="error" class="stats-table-error" role="alert">
      <span>{{ error }}</span>
      <TfmButton variant="outline" size="sm" :loading="loading" @click="$emit('retry')"><span v-i18n>Retry</span></TfmButton>
    </div>

    <div v-if="loading && rows.length === 0" class="stats-table-loading" role="status">
      <div v-for="index in 5" :key="index" class="stats-table-skeleton-row"><i></i><i></i><i></i><i></i></div>
    </div>
    <PortalEmptyState v-else-if="!loading && !error && rows.length === 0" title="No cards match these filters" description="Try a lower minimum sample count or a wider time window." />
    <div v-else class="stats-table-wrap">
      <table class="stats-card-table">
        <thead>
          <tr>
            <th class="stats-card-table__name"><span v-i18n>Card</span></th>
            <th><span v-i18n>Finish</span><small v-i18n>average place</small></th>
            <th><span v-i18n>Inclusion</span><small v-i18n>final tableau</small></th>
            <th><span v-i18n>Wins</span><small v-i18n>rate</small></th>
            <th><span v-i18n>Lift</span><small v-i18n>percentage points</small></th>
            <th><span v-i18n>Score</span><small v-i18n>average</small></th>
            <th><span v-i18n>Card VP</span><small v-i18n>average</small></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.type + '-' + row.name">
            <td class="stats-card-table__name">
              <StatsCardIdentity :name="row.name" :low-sample="row.plays < 10" />
            </td>
            <td>{{ formatPosition(row.avgPosition) }}</td>
            <td><strong>{{ formatPercent(row.playRate) }}</strong><small>{{ formatInteger(row.plays) }} <span v-i18n>appearances</span></small></td>
            <td><strong>{{ formatInteger(row.wins) }}</strong><small>{{ formatPercent(row.winRate) }}</small></td>
            <td :class="liftClass(row.lift)">{{ formatLift(row.lift) }}</td>
            <td>{{ formatDecimal(row.avgScore) }}</td>
            <td>{{ row.avgCardVp === null ? '—' : formatDecimal(row.avgCardVp) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <template #footer>
      <div class="stats-table-footer">
        <span v-if="total > 0" class="stats-table-page-copy">{{ pageStart }}–{{ pageEnd }} <span v-i18n>of</span> {{ total }}</span>
        <span v-else></span>
        <div class="stats-table-pagination">
          <TfmButton variant="ghost" size="sm" :disabled="loading || refreshing || Boolean(error) || page <= 1" @click="$emit('page-change', page - 1)"><span v-i18n>Previous</span></TfmButton>
          <span class="stats-table-page-number">{{ page }}</span>
          <TfmButton variant="ghost" size="sm" :disabled="loading || refreshing || Boolean(error) || pageEnd >= total" @click="$emit('page-change', page + 1)"><span v-i18n>Next</span></TfmButton>
        </div>
      </div>
    </template>
  </PortalPanel>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';
import PortalEmptyState from '@/client/components/common/PortalEmptyState.vue';
import PortalPanel from '@/client/components/common/PortalPanel.vue';
import TfmButton from '@/client/components/common/TfmButton.vue';
import {StatsCardRow} from '@/common/models/StatsModel';
import StatsCardIdentity from './StatsCardIdentity.vue';

export default defineComponent({
  name: 'StatsCardTable',
  components: {PortalEmptyState, PortalPanel, TfmButton, StatsCardIdentity},
  props: {
    rows: {type: Array as PropType<StatsCardRow[]>, required: true},
    total: {type: Number, required: true},
    page: {type: Number, required: true},
    pageSize: {type: Number, required: true},
    loading: {type: Boolean, default: false},
    refreshing: {type: Boolean, default: false},
    error: {type: String, default: ''},
  },
  emits: ['retry', 'page-change'],
  computed: {
    pageStart(): number {
      return this.total === 0 ? 0 : ((this.page - 1) * this.pageSize) + 1;
    },
    pageEnd(): number {
      return Math.min(this.total, this.page * this.pageSize);
    },
    eligibleEntries(): number {
      return this.rows[0]?.eligibleEntries ?? 0;
    },
  },
  methods: {
    formatInteger(value: number): string {
      return Number.isFinite(value) ? Math.round(value).toLocaleString() : '—';
    },
    formatDecimal(value: number): string {
      return Number.isFinite(value) ? value.toFixed(1) : '—';
    },
    formatPercent(value: number): string {
      if (!Number.isFinite(value)) {
        return '—';
      }
      return `${value.toFixed(1)}%`;
    },
    formatLift(value: number | null): string {
      if (value === null || !Number.isFinite(value)) {
        return '—';
      }
      return `${value > 0 ? '+' : ''}${value.toFixed(1)} pp`;
    },
    formatPosition(value: number): string {
      return Number.isFinite(value) ? `#${value.toFixed(1)}` : '—';
    },
    liftClass(value: number | null): string {
      if (value === null || !Number.isFinite(value)) {
        return 'stats-card-table__lift--none';
      }
      return value > 0 ? 'stats-card-table__lift--positive' : value < 0 ? 'stats-card-table__lift--negative' : 'stats-card-table__lift--none';
    },
  },
});
</script>

<style scoped>
.stats-cards-panel { min-width: 0; overflow: hidden; }
.stats-table-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.stats-table-heading__meta { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 9px; color: var(--portal-muted); font-size: 12px; }
.stats-refreshing { color: var(--portal-accent); }
.stats-table-count, .stats-table-denominator { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.stats-table-error { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 24px; border-bottom: 1px solid var(--portal-border); color: #f2b4a3; font-size: 13px; }
.stats-table-wrap { width: 100%; overflow-x: auto; }
.stats-card-table { width: 100%; min-width: 840px; border-collapse: collapse; text-align: right; }
.stats-card-table th { padding: 13px 24px 12px 12px; border-bottom: 1px solid var(--portal-border); color: var(--portal-muted); font: 700 10px/1.25 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .1em; text-transform: uppercase; white-space: nowrap; }
.stats-card-table th:first-child, .stats-card-table td:first-child { padding-left: 24px; }
.stats-card-table th:last-child, .stats-card-table td:last-child { padding-right: 24px; }
.stats-card-table th small { display: block; margin-top: 4px; color: color-mix(in srgb, var(--portal-muted) 72%, transparent); font-family: inherit; font-size: 9px; font-weight: 500; line-height: 1.2; letter-spacing: 0; text-transform: none; }
.stats-card-table td { padding: 14px 24px 14px 12px; border-bottom: 1px solid color-mix(in srgb, var(--portal-border) 65%, transparent); color: var(--portal-text); font: 500 13px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: nowrap; }
.stats-card-table tbody tr { transition: background .18s ease; }
.stats-card-table tbody tr:hover { background: rgba(255,255,255,.025); }
.stats-card-table td strong { display: block; font-family: inherit; font-size: inherit; font-weight: 500; line-height: inherit; }
.stats-card-table td small { display: block; margin-top: 4px; color: var(--portal-muted); font: 500 10px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; }
.stats-card-table td.stats-card-table__name { width: 28%; min-width: 240px; text-align: left; white-space: normal; }
.stats-card-table td.stats-card-table__lift--positive { color: #74dfce; }
.stats-card-table td.stats-card-table__lift--negative { color: #f1a18b; }
.stats-card-table td.stats-card-table__lift--none { color: var(--portal-muted); }
.stats-table-loading { display: grid; gap: 1px; padding: 8px 24px; }
.stats-table-skeleton-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 12px; padding: 16px 0; border-bottom: 1px solid color-mix(in srgb, var(--portal-border) 65%, transparent); }
.stats-table-skeleton-row i { display: block; height: 12px; border-radius: 4px; background: linear-gradient(90deg, rgba(164,185,213,.08), rgba(164,185,213,.18), rgba(164,185,213,.08)); background-size: 220% 100%; animation: stats-skeleton-shimmer 1.4s ease-in-out infinite; }
.stats-table-skeleton-row i:first-child { height: 15px; }
.stats-table-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 62px; }
.stats-table-page-copy { color: var(--portal-muted); font: 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }
.stats-table-pagination { display: flex; align-items: center; gap: 6px; }
.stats-table-page-number { min-width: 24px; color: var(--portal-text); font: 600 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; text-align: center; }
@keyframes stats-skeleton-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
@media (max-width: 600px) {
  .stats-table-heading { align-items: stretch; flex-direction: column; }
  .stats-table-heading__meta { width: 100%; justify-content: space-between; }
  .stats-table-error { align-items: flex-start; flex-direction: column; padding: 14px 18px; }
  .stats-card-table th:first-child, .stats-card-table td:first-child { padding-left: 18px; }
  .stats-card-table th:last-child, .stats-card-table td:last-child { padding-right: 18px; }
  .stats-table-footer { align-items: flex-start; flex-direction: column; gap: 8px; padding: 14px 18px; }
  .stats-table-pagination { width: 100%; justify-content: space-between; }
}
@media (prefers-reduced-motion: reduce) {
  .stats-table-skeleton-row i { animation: none; }
  .stats-card-table tbody tr { transition: none; }
}
</style>
