<template>
  <div class="stats-card-section">
    <div v-if="stale && !refreshing" class="stats-section-stale" role="status">
      <span v-i18n>Showing the previous card results while the new result is unavailable.</span>
    </div>
    <StatsCardTable
      :rows="response?.rows || []"
      :total="response?.total || 0"
      :page="committedPage"
      :page-size="committedPageSize"
      :loading="loading && !response"
      :refreshing="refreshing"
      :error="error"
      @retry="retry"
      @page-change="changePage"
    >
      <template #header>
        <div class="stats-section-heading">
          <h2>{{ $t(title) }}</h2>
          <div class="stats-section-controls">
            <label class="stats-section-field">
              <span v-i18n>Sort</span>
              <select :id="`stats-card-sort-${type}`" :value="sort" :aria-label="$t('Sort')" @change="changeSort">
                <option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ $t(option.label) }}</option>
              </select>
            </label>
            <label class="stats-section-field">
              <span v-i18n>Minimum samples</span>
              <select :id="`stats-card-min-games-${type}`" :value="minGames" :aria-label="$t('Minimum samples')" @change="changeMinGames">
                <option v-for="option in minGamesOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </label>
            <label class="stats-section-field">
              <span v-i18n>Rows per page</span>
              <select :id="`stats-card-page-size-${type}`" :value="pageSize" :aria-label="$t('Rows per page')" @change="changePageSize">
                <option v-for="option in pageSizeOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </label>
          </div>
        </div>
      </template>
    </StatsCardTable>
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';
import {StatsCardSort, StatsCardType, StatsCardsResponse} from '@/common/models/StatsModel';
import StatsCardTable from './StatsCardTable.vue';
import {fetchStatsCards, StatsCardsQuery, StatsOverviewQuery} from './StatsApi';

const CARD_SORT_OPTIONS: Array<{value: string; label: string}> = [
  {value: 'avgPosition', label: 'Average finish (ascending)'},
  {value: 'plays', label: 'Inclusion'},
  {value: 'winRate', label: 'Win rate'},
  {value: 'lift', label: 'Lift'},
  {value: 'avgScore', label: 'Average score'},
  {value: 'avgCardVp', label: 'Card VP'},
];

const MIN_GAMES_OPTIONS = [1, 5, 10, 25, 50];
const PAGE_SIZE_OPTIONS = [6, 12, 30];

export default defineComponent({
  name: 'StatsCardSection',
  components: {StatsCardTable},
  props: {
    title: {type: String, required: true},
    type: {type: String as PropType<StatsCardType>, required: true},
    cohort: {type: Object as PropType<StatsOverviewQuery>, required: true},
  },
  data() {
    return {
      response: null as StatsCardsResponse | null,
      error: '',
      loading: true,
      refreshing: false,
      sort: 'avgPosition' as StatsCardSort,
      minGames: 5,
      pageSize: 6,
      page: 1,
      requestGeneration: 0,
      committedQueryKey: '',
      abort: undefined as AbortController | undefined,
    };
  },
  computed: {
    sortOptions(): Array<{value: string; label: string}> {
      return CARD_SORT_OPTIONS;
    },
    minGamesOptions(): number[] {
      return MIN_GAMES_OPTIONS;
    },
    pageSizeOptions(): number[] {
      return PAGE_SIZE_OPTIONS;
    },
    requestQuery(): StatsCardsQuery {
      return {
        ...this.cohort,
        type: this.type,
        sort: this.sort,
        minGames: this.minGames,
        page: this.page,
        pageSize: this.pageSize,
      };
    },
    committedPage(): number {
      return this.response?.page ?? 1;
    },
    committedPageSize(): number {
      return this.response?.pageSize ?? this.pageSize;
    },
    totalPages(): number {
      if (!this.response) {
        return 1;
      }
      return Math.max(1, Math.ceil(this.response.total / this.committedPageSize));
    },
    stale(): boolean {
      return this.response !== null && this.committedQueryKey !== this.queryKey(this.requestQuery);
    },
  },
  watch: {
    cohort: {
      deep: true,
      handler(): void {
        this.page = 1;
        this.loadCards();
      },
    },
  },
  mounted() {
    this.loadCards();
  },
  beforeUnmount() {
    this.requestGeneration++;
    this.abort?.abort();
  },
  methods: {
    changeSort(event: Event): void {
      const value = (event.target as HTMLSelectElement).value;
      if (!CARD_SORT_OPTIONS.some((option) => option.value === value) || value === this.sort) {
        return;
      }
      this.sort = value as StatsCardSort;
      this.page = 1;
      this.loadCards();
    },
    changeMinGames(event: Event): void {
      const value = Number((event.target as HTMLSelectElement).value);
      if (!MIN_GAMES_OPTIONS.includes(value) || value === this.minGames) {
        return;
      }
      this.minGames = value;
      this.page = 1;
      this.loadCards();
    },
    changePageSize(event: Event): void {
      const value = Number((event.target as HTMLSelectElement).value);
      if (!PAGE_SIZE_OPTIONS.includes(value) || value === this.pageSize) {
        return;
      }
      this.pageSize = value;
      this.page = 1;
      this.loadCards();
    },
    changePage(page: number): void {
      if (!Number.isInteger(page) || page < 1 || page > this.totalPages || page === this.page) {
        return;
      }
      this.page = page;
      this.loadCards();
    },
    retry(): void {
      this.loadCards();
    },
    loadCards(): void {
      this.abort?.abort();
      const generation = ++this.requestGeneration;
      const query = {...this.requestQuery};
      const controller = new AbortController();
      this.abort = controller;
      this.error = '';
      this.loading = this.response === null;
      this.refreshing = this.response !== null;
      void this.fetchCards(query, generation, controller.signal);
    },
    async fetchCards(query: StatsCardsQuery, generation: number, signal: AbortSignal): Promise<void> {
      try {
        const result = await fetchStatsCards(query, signal);
        if (signal.aborted || generation !== this.requestGeneration) {
          return;
        }
        this.response = result;
        this.page = result.page;
        this.pageSize = result.pageSize;
        this.committedQueryKey = this.queryKey({...query, page: result.page, pageSize: result.pageSize});
        this.error = '';
      } catch (error) {
        if (signal.aborted || generation !== this.requestGeneration || this.isAbortError(error)) {
          return;
        }
        this.error = this.errorMessage(error);
      } finally {
        if (generation === this.requestGeneration) {
          this.loading = false;
          this.refreshing = false;
        }
      }
    },
    isAbortError(error: unknown): boolean {
      return typeof error === 'object' && error !== null && 'name' in error && (error as {name?: unknown}).name === 'AbortError';
    },
    errorMessage(error: unknown): string {
      if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
      }
      return this.$t('Unable to load cards. Please try again.');
    },
    queryKey(query: StatsCardsQuery): string {
      return JSON.stringify({...query, userName: query.userName?.trim() || undefined});
    },
  },
});
</script>

<style scoped>
.stats-card-section { min-width: 0; }
.stats-section-stale { margin-bottom: 10px; padding: 10px 13px; border: 1px solid color-mix(in srgb, var(--portal-accent) 25%, var(--portal-border)); border-radius: 8px; background: color-mix(in srgb, var(--portal-accent) 6%, var(--portal-surface)); color: var(--portal-muted); font-size: 12px; }
.stats-section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; min-width: 0; }
.stats-section-heading h2 { margin: 0; color: var(--portal-text); font-size: 17px; line-height: 1.3; }
.stats-section-controls { display: flex; align-items: flex-end; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
.stats-section-field { display: grid; gap: 6px; min-width: 132px; color: var(--portal-muted); font-size: 10px; }
.stats-section-field > span { font: 700 10px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .08em; text-transform: uppercase; }
.stats-section-field select { min-height: 36px; border: 1px solid var(--portal-border); border-radius: 8px; padding: 7px 10px; background: var(--portal-elevated); color: var(--portal-text); font-family: inherit; font-size: 12px; font-weight: 500; line-height: 1.35; outline: none; }
.stats-section-field select:hover { border-color: color-mix(in srgb, var(--portal-accent) 45%, var(--portal-border)); }
.stats-section-field select:focus { border-color: var(--portal-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--portal-accent) 16%, transparent); }
@media (max-width: 760px) {
  .stats-section-heading { align-items: flex-start; flex-direction: column; }
  .stats-section-controls { width: 100%; justify-content: flex-start; }
}
@media (max-width: 600px) {
  .stats-section-controls { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stats-section-field { min-width: 0; }
  .stats-section-field:first-child { grid-column: 1 / -1; }
  .stats-section-field select { box-sizing: border-box; min-width: 0; width: 100%; }
}
</style>
