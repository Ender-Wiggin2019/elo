<template>
  <main class="stats-page portal-page portal-enter">
    <PortalPageHeader title="Statistics">
      <template #actions>
        <span v-if="overview" class="stats-snapshot-date">{{ snapshotText }}</span>
      </template>
    </PortalPageHeader>

    <PortalTabs
      class="stats-scope-tabs"
      :model-value="draft.scope"
      :items="scopeTabs"
      @update:model-value="changeScope"
    />

    <PortalPanel padding="normal" class="stats-filter-panel">
      <form class="stats-filter-form" @submit.prevent="applyNamedSearch">
        <div class="stats-filter-fields">
          <label class="stats-field">
            <span v-i18n>Window</span>
            <select id="stats-days" :value="draft.days" @change="changeDays">
              <option v-for="days in rangeOptions" :key="days" :value="days" :disabled="rangeDisabled(days)">{{ rangeLabel(days) }}</option>
            </select>
          </label>
          <label class="stats-field">
            <span v-i18n>Players</span>
            <select id="stats-players" :value="draft.players" @change="changePlayers">
              <option v-for="option in playerOptions" :key="option.value" :value="option.value">{{ $t(option.label) }}</option>
            </select>
          </label>
          <label class="stats-field">
            <span v-i18n>Mode</span>
            <select id="stats-mode" :value="draft.mode" @change="changeMode">
              <option value="all" v-i18n>All modes</option>
              <option value="ranked" v-i18n>Ranked</option>
              <option value="casual" v-i18n>Casual</option>
            </select>
          </label>
          <label v-if="draft.scope === 'personal'" class="stats-field stats-field--name">
            <span v-i18n>Player name <em v-if="auth.isLoggedIn" v-i18n>(optional)</em></span>
            <input
              id="stats-user-name"
              v-model="draft.userName"
              type="search"
              autocomplete="off"
              maxlength="80"
              :placeholder="auth.isLoggedIn ? auth.userName : $t('Search a public player')"
              :aria-label="$t('Player name')"
            >
          </label>
          <TfmButton v-if="draft.scope === 'personal'" variant="primary" size="md" type="submit" :loading="overviewLoading && !overview"><span v-i18n>Apply player</span></TfmButton>
          <button type="button" class="stats-reset-button" @click="resetFilters" v-i18n>Reset filters</button>
        </div>
        <p v-if="accessNotice" class="stats-access-note"><span aria-hidden="true">●</span> {{ accessNotice }}</p>
      </form>
    </PortalPanel>

    <div v-if="overviewStale" class="stats-refresh-banner" role="status">
      <span v-if="overviewRefreshing" v-i18n>Refreshing this cohort…</span>
      <span v-else v-i18n>Showing the previous cohort while the new result is unavailable.</span>
    </div>

    <PortalEmptyState
      v-if="overviewError && !overview && !overviewLoading"
      title="Unable to load statistics"
      :description="overviewError"
    >
      <TfmButton variant="outline" :loading="overviewLoading" @click="retryOverview"><span v-i18n>Retry</span></TfmButton>
    </PortalEmptyState>

    <div v-else-if="overviewLoading && !overview" class="stats-loading" role="status" aria-live="polite">
      <div class="stats-loading__kpis"><i v-for="index in 4" :key="index"></i></div>
      <div class="stats-loading__panels"><i></i><i></i></div>
      <span v-i18n>Loading statistics…</span>
    </div>

    <template v-else-if="overview">
      <div v-if="overviewError" class="stats-inline-error" role="alert">
        <span>{{ overviewError }}</span>
        <TfmButton variant="ghost" size="sm" :loading="overviewRefreshing" @click="retryOverview"><span v-i18n>Retry</span></TfmButton>
      </div>

      <section class="stats-kpi-grid" :aria-label="$t('Summary statistics')">
        <article class="stats-kpi">
          <span class="stats-kpi__label" v-i18n>Games</span>
          <strong class="stats-kpi__value">{{ formatInteger(overview.summary.games) }}</strong>
          <span class="stats-kpi__hint" v-i18n>normally completed</span>
        </article>
        <article class="stats-kpi">
          <span class="stats-kpi__label" v-i18n>Registered players</span>
          <strong class="stats-kpi__value">{{ formatInteger(overview.summary.registeredPlayers) }}</strong>
          <span class="stats-kpi__hint">{{ formatInteger(overview.summary.playerEntries) }} <span v-i18n>player entries</span></span>
        </article>
        <article class="stats-kpi">
          <span class="stats-kpi__label" v-i18n>Win rate</span>
          <strong class="stats-kpi__value">{{ formatPercent(overview.summary.winRate) }}</strong>
          <span class="stats-kpi__hint">{{ formatInteger(overview.summary.wins) }} <span v-i18n>wins</span></span>
        </article>
        <article class="stats-kpi">
          <span class="stats-kpi__label" v-i18n>Average score</span>
          <strong class="stats-kpi__value">{{ formatDecimal(overview.summary.avgScore) }}</strong>
          <span class="stats-kpi__hint">{{ formatDecimal(overview.summary.avgCards) }} <span v-i18n>cards per tableau</span></span>
        </article>
      </section>

      <PortalPanel padding="compact" class="stats-record-panel">
        <div class="stats-record-grid">
          <div><span v-i18n>Best score</span><strong>{{ formatDecimal(overview.summary.bestScore) }}</strong></div>
          <div><span v-i18n>Average finish</span><strong>{{ formatPosition(overview.summary.avgPosition) }}</strong></div>
          <div><span v-i18n>Average generations</span><strong>{{ formatDecimal(overview.summary.avgGenerations) }}</strong></div>
          <div><span v-i18n>Card-complete games</span><strong>{{ formatInteger(overview.summary.cardGames) }} / {{ formatInteger(overview.summary.games) }}</strong></div>
        </div>
      </PortalPanel>

      <div v-if="overview.summary.games === 0" class="stats-no-games">
        <PortalEmptyState title="No completed games in this range" description="Try a wider window or a different player cohort." />
      </div>
      <StatsCharts v-else :overview="overview" />

      <aside class="stats-method-note">
        <span class="stats-method-note__mark" aria-hidden="true">i</span>
        <p><span v-i18n>Only normally completed games are counted.</span> <span v-i18n>Card inclusion means the card was present in the final tableau, not that it was offered or selected. Lift is an association with winning, not a causal effect.</span> <span v-i18n>Historical coverage can be incomplete. Score breakdown and direct card VP use only games that recorded those fields.</span></p>
      </aside>

      <div class="stats-card-sections">
        <StatsCardSection
          v-for="section in cardSections"
          :key="`${authGeneration}-${cardResetGeneration}-${section.type}`"
          :title="section.title"
          :type="section.type"
          :cohort="currentOverviewQuery"
        />
      </div>
    </template>

    <PortalEmptyState v-else-if="needsPersonalLogin" title="Sign in to view your personal statistics" description="You can still search a public player by name." >
      <TfmButton href="/login" variant="primary"><span v-i18n>Sign In</span></TfmButton>
    </PortalEmptyState>
  </main>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import PortalEmptyState from '@/client/components/common/PortalEmptyState.vue';
import PortalPageHeader from '@/client/components/common/PortalPageHeader.vue';
import PortalPanel from '@/client/components/common/PortalPanel.vue';
import PortalTabs, {PortalTab} from '@/client/components/common/PortalTabs.vue';
import TfmButton from '@/client/components/common/TfmButton.vue';
import {userStore, UserState} from '@/client/stores';
import {
  StatsCardType,
  StatsDays,
  StatsMode,
  StatsOverview,
  StatsScope,
  STATS_RANGES,
} from '@/common/models/StatsModel';
import StatsCardSection from './StatsCardSection.vue';
import StatsCharts from './StatsCharts.vue';
import {clearStatsOverviewCache, fetchStatsOverview, StatsOverviewQuery} from './StatsApi';

interface StatsDraft {
  scope: StatsScope;
  days: StatsDays;
  players: number;
  mode: StatsMode;
  userName: string;
}

interface AuthView {
  userId: string;
  userName: string;
  isLoggedIn: boolean;
  isVip: boolean;
}

interface CardSectionDefinition {
  type: StatsCardType;
  title: string;
}

function authView(): AuthView {
  return {
    userId: userStore.userId,
    userName: userStore.userName,
    isLoggedIn: userStore.isLoggedIn,
    isVip: userStore.isVip,
  };
}

function initialStatsDraft(): StatsDraft {
  const search = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const scope: StatsScope = search.get('scope') === 'personal' ? 'personal' : 'community';
  const userName = scope === 'personal' ? (search.get('userName')?.trim() ?? '') : '';
  return {scope, days: 14, players: 0, mode: 'all', userName};
}

function queryKey(query: StatsOverviewQuery): string {
  return JSON.stringify({
    scope: query.scope,
    days: query.days,
    players: query.players,
    mode: query.mode,
    userName: query.userName?.trim() || undefined,
  });
}

export default defineComponent({
  name: 'StatsPage',
  components: {PortalEmptyState, PortalPageHeader, PortalPanel, PortalTabs, StatsCardSection, StatsCharts, TfmButton},
  data() {
    const initialDraft = initialStatsDraft();
    return {
      auth: authView() as AuthView,
      draft: initialDraft,
      appliedUserName: initialDraft.userName,
      rangeOptions: [...STATS_RANGES] as StatsDays[],
      playerOptions: [
        {value: 0, label: 'Multiplayer'},
        {value: 1, label: 'Solo'},
        {value: 2, label: '2 players'},
        {value: 3, label: '3 players'},
        {value: 4, label: '4 players'},
        {value: 5, label: '5 players'},
        {value: 6, label: '6 players'},
      ],
      scopeTabs: [
        {id: 'community', label: 'All players'},
        {id: 'personal', label: 'Personal'},
      ] as PortalTab[],
      cardSections: [
        {type: 'corporation', title: 'Corporations'},
        {type: 'prelude', title: 'Preludes'},
        {type: 'project', title: 'Project cards'},
        {type: 'ceo', title: 'CEOs'},
      ] as CardSectionDefinition[],
      cardResetGeneration: 0,
      overview: null as StatsOverview | null,
      overviewError: '',
      overviewLoading: true,
      overviewRefreshing: false,
      overviewKey: '',
      queryGeneration: 0,
      overviewRequestGeneration: 0,
      overviewAbort: undefined as AbortController | undefined,
      authGeneration: 0,
      unsubscribeUser: undefined as (() => void) | undefined,
    };
  },
  computed: {
    needsPersonalLogin(): boolean {
      return this.draft.scope === 'personal' && !this.auth.isLoggedIn && this.appliedUserName.trim().length === 0;
    },
    currentOverviewQuery(): StatsOverviewQuery {
      return {
        scope: this.draft.scope,
        days: this.draft.days,
        players: this.draft.players,
        mode: this.draft.mode,
        userName: this.draft.scope === 'personal' ? (this.appliedUserName.trim() || undefined) : undefined,
      };
    },
    currentQueryKey(): string {
      return queryKey(this.currentOverviewQuery);
    },
    overviewStale(): boolean {
      return this.overview !== null && this.overviewKey !== this.currentQueryKey;
    },
    snapshotText(): string {
      if (!this.overview) {
        return '';
      }
      const scope = this.overview.cohort.scope === 'community' ? 'All players' : 'Personal';
      return `${this.$t(`${this.overview.cohort.days} days`)} · ${this.$t(scope)}`;
    },
    accessNotice(): string {
      if (!this.overview) {
        return '';
      }
      const maxDays = this.draft.scope === 'personal' ? this.overview.access.maxPersonalDays : this.overview.access.maxCommunityDays;
      if (maxDays >= 180) {
        return '';
      }
      return `${this.$t('History for this view is limited to')} ${maxDays} ${this.$t('days')}.`;
    },
  },
  mounted() {
    this.unsubscribeUser = userStore.subscribe(this.handleUserChange);
    this.loadData();
  },
  beforeUnmount() {
    this.unsubscribeUser?.();
    this.overviewAbort?.abort();
  },
  methods: {
    rangeLabel(days: number): string {
      return this.$t(`Last ${days} days`);
    },
    rangeDisabled(days: StatsDays): boolean {
      const maxDays = this.overview === null ?
        (this.draft.scope === 'personal' ? 180 : (this.auth.isVip ? 180 : 14)) :
        (this.draft.scope === 'personal' ? this.overview.access.maxPersonalDays : this.overview.access.maxCommunityDays);
      return days > maxDays;
    },
    makeOverviewQuery(): StatsOverviewQuery {
      return {...this.currentOverviewQuery};
    },
    changeScope(scope: string | number): void {
      const next = String(scope) as StatsScope;
      if (next !== 'community' && next !== 'personal') {
        return;
      }
      if (this.draft.scope === next) {
        return;
      }
      this.draft.scope = next;
      if (next === 'community') {
        const maxDays = this.overview?.access.maxCommunityDays ?? (this.auth.isVip ? 180 : 14);
        if (this.draft.days > maxDays) {
          const supportedRanges = STATS_RANGES.filter((days) => days <= maxDays);
          this.draft.days = (supportedRanges[supportedRanges.length - 1] ?? 14) as StatsDays;
        }
      }
      this.loadData();
    },
    changeDays(event: Event): void {
      const value = Number((event.target as HTMLSelectElement).value) as StatsDays;
      if (!STATS_RANGES.includes(value)) {
        return;
      }
      this.draft.days = value;
      this.loadData();
    },
    changePlayers(event: Event): void {
      const value = Number((event.target as HTMLSelectElement).value);
      if (!Number.isInteger(value) || value < 0 || value > 6) {
        return;
      }
      this.draft.players = value;
      this.loadData();
    },
    changeMode(event: Event): void {
      const value = (event.target as HTMLSelectElement).value as StatsMode;
      if (!['all', 'ranked', 'casual'].includes(value)) {
        return;
      }
      this.draft.mode = value;
      this.loadData();
    },
    applyNamedSearch(): void {
      this.draft.userName = this.draft.userName.trim();
      this.appliedUserName = this.draft.userName;
      this.loadData();
    },
    resetFilters(): void {
      this.draft = {scope: 'community', days: 14, players: 0, mode: 'all', userName: ''};
      this.appliedUserName = '';
      this.cardResetGeneration++;
      this.loadData();
    },
    loadData(): void {
      this.overviewAbort?.abort();
      if (this.needsPersonalLogin) {
        this.queryGeneration++;
        this.overview = null;
        this.overviewKey = '';
        this.overviewError = '';
        this.overviewLoading = false;
        this.overviewRefreshing = false;
        return;
      }

      const generation = ++this.queryGeneration;
      const overviewGeneration = ++this.overviewRequestGeneration;
      const overviewQuery = this.makeOverviewQuery();
      this.overviewAbort = new AbortController();
      this.overviewError = '';
      this.overviewLoading = this.overview === null;
      this.overviewRefreshing = this.overview !== null;

      void this.loadOverviewResult(overviewQuery, generation, overviewGeneration, this.overviewAbort.signal);
    },
    async loadOverviewResult(query: StatsOverviewQuery, generation: number, requestGeneration: number, signal: AbortSignal): Promise<void> {
      try {
        const result = await fetchStatsOverview(query, signal);
        if (generation !== this.queryGeneration || requestGeneration !== this.overviewRequestGeneration) {
          return;
        }
        this.overview = result;
        this.overviewKey = queryKey(query);
        this.overviewError = '';
        const returnedDays = result.cohort.days as StatsDays;
        if (result.cohort.scope === this.draft.scope && STATS_RANGES.includes(returnedDays) && returnedDays !== this.draft.days) {
          this.draft.days = returnedDays;
        }
      } catch (error) {
        if (generation !== this.queryGeneration || requestGeneration !== this.overviewRequestGeneration || this.isAbortError(error)) {
          return;
        }
        this.overviewError = this.errorMessage(error);
      } finally {
        if (generation === this.queryGeneration && requestGeneration === this.overviewRequestGeneration) {
          this.overviewLoading = false;
          this.overviewRefreshing = false;
        }
      }
    },
    retryOverview(): void {
      this.loadData();
    },
    handleUserChange(state: UserState): void {
      const previous = this.auth;
      this.auth = {
        userId: state.userId,
        userName: state.userName,
        isLoggedIn: state.userId !== '' && state.userName !== '',
        isVip: state.isVip,
      };
      if (previous.userId === this.auth.userId && previous.userName === this.auth.userName && previous.isVip === this.auth.isVip) {
        return;
      }
      clearStatsOverviewCache();
      this.overviewAbort?.abort();
      this.queryGeneration++;
      this.overviewRequestGeneration++;
      this.authGeneration++;
      this.overview = null;
      this.overviewKey = '';
      this.overviewError = '';
      this.overviewLoading = true;
      this.overviewRefreshing = false;
      if (this.draft.scope === 'community' && !this.auth.isVip && this.draft.days > 14) {
        this.draft.days = 14;
      }
      this.loadData();
    },
    isAbortError(error: unknown): boolean {
      return typeof error === 'object' && error !== null && 'name' in error && (error as {name?: unknown}).name === 'AbortError';
    },
    errorMessage(error: unknown): string {
      if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
      }
      return this.$t('Unable to load statistics. Please try again.');
    },
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
    formatPosition(value: number): string {
      return Number.isFinite(value) ? `#${value.toFixed(1)}` : '—';
    },
  },
});
</script>

<style scoped>
.stats-page { width: 100%; box-sizing: border-box; --stats-gap: 18px; max-width: 1180px; margin: 0 auto; padding: 32px 28px 72px; }
.stats-page > * + * { margin-top: var(--stats-gap); }
.stats-snapshot-date { color: var(--portal-muted); font: 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; text-transform: uppercase; letter-spacing: .1em; }
.stats-scope-tabs { width: min(100%, 430px); }
.stats-filter-panel { overflow: hidden; }
.stats-filter-form { display: grid; gap: 22px; }
.stats-card-sections { display: grid; gap: 18px; }
.stats-reset-button { border: 0; padding: 5px 0; background: transparent; color: var(--portal-muted); font-family: inherit; font-size: 12px; font-weight: 600; line-height: 1.3; cursor: pointer; }
.stats-reset-button:hover { color: var(--portal-text); }
.stats-reset-button:focus-visible { outline: 2px solid var(--portal-accent); outline-offset: 4px; }
.stats-filter-fields { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 14px; }
.stats-field { display: grid; flex: 0 1 170px; gap: 7px; min-width: 0; color: var(--portal-muted); font-size: 11px; }
.stats-field--name { flex-basis: 230px; }
.stats-field > span { font: 700 10px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .1em; text-transform: uppercase; }
.stats-field em { color: color-mix(in srgb, var(--portal-muted) 75%, transparent); font-style: normal; font-weight: 500; letter-spacing: 0; text-transform: none; }
.stats-field select, .stats-field input { width: 100%; min-height: 40px; border: 1px solid var(--portal-border); border-radius: 8px; padding: 9px 11px; background: var(--portal-elevated); color: var(--portal-text); font-family: inherit; font-size: 13px; font-weight: 500; line-height: 1.4; outline: none; }
.stats-field select { cursor: pointer; }
.stats-field select:hover, .stats-field input:hover { border-color: color-mix(in srgb, var(--portal-accent) 45%, var(--portal-border)); }
.stats-field select:focus, .stats-field input:focus { border-color: var(--portal-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--portal-accent) 16%, transparent); }
.stats-field select:disabled { color: color-mix(in srgb, var(--portal-muted) 65%, transparent); cursor: not-allowed; }
.stats-access-note { display: flex; align-items: center; gap: 8px; margin: 0; color: #f3c36c; font-size: 12px; }
.stats-access-note > span { color: #f3a84d; font-size: 10px; }
.stats-refresh-banner, .stats-inline-error { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 11px 14px; border: 1px solid color-mix(in srgb, var(--portal-accent) 25%, var(--portal-border)); border-radius: 9px; background: color-mix(in srgb, var(--portal-accent) 6%, var(--portal-surface)); color: var(--portal-muted); font-size: 13px; }
.stats-inline-error { border-color: rgba(239,108,87,.35); color: #f2b4a3; }
.stats-loading { display: grid; gap: 18px; color: var(--portal-muted); font-size: 13px; }
.stats-loading__kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.stats-loading__panels { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
.stats-loading i { display: block; min-height: 106px; border: 1px solid var(--portal-border); border-radius: 10px; background: linear-gradient(110deg, rgba(164,185,213,.05), rgba(164,185,213,.14), rgba(164,185,213,.05)); background-size: 220% 100%; animation: stats-skeleton-shimmer 1.4s ease-in-out infinite; }
.stats-loading__panels i { min-height: 240px; }
.stats-loading > span { padding-left: 3px; }
.stats-kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.stats-kpi { display: grid; gap: 8px; min-width: 0; padding: 20px; border: 1px solid var(--portal-border); border-radius: 10px; background: linear-gradient(145deg, rgba(255,255,255,.035), transparent 70%), var(--portal-surface); box-shadow: 0 6px 20px rgba(0,0,0,.14); }
.stats-kpi__label { color: var(--portal-muted); font: 700 10px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .13em; text-transform: uppercase; }
.stats-kpi__value { color: var(--portal-text); font: 700 clamp(25px, 3vw, 34px)/1.05 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: -.04em; }
.stats-kpi__hint { min-height: 18px; color: var(--portal-muted); font-size: 11px; line-height: 1.4; }
.stats-record-panel { border-color: color-mix(in srgb, var(--portal-border) 75%, var(--portal-accent)); }
.stats-record-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.stats-record-grid > div { display: grid; gap: 5px; min-width: 0; }
.stats-record-grid span { color: var(--portal-muted); font-size: 11px; }
.stats-record-grid strong { color: var(--portal-text); font: 600 16px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; }
.stats-no-games { border: 1px solid var(--portal-border); border-radius: 10px; background: var(--portal-surface); }
.stats-method-note { display: flex; gap: 12px; padding: 15px 17px; border-left: 2px solid color-mix(in srgb, var(--portal-accent) 70%, transparent); background: rgba(244,129,70,.045); color: var(--portal-muted); }
.stats-method-note__mark { display: inline-grid; flex: 0 0 auto; place-items: center; width: 18px; height: 18px; border: 1px solid color-mix(in srgb, var(--portal-accent) 60%, transparent); border-radius: 50%; color: var(--portal-accent); font: 700 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
.stats-method-note p { margin: 0; font-size: 12px; line-height: 1.65; }
@keyframes stats-skeleton-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
@media (max-width: 900px) {
  .stats-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stats-loading__kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stats-loading__panels { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .stats-page { padding: 22px 16px 48px; }
  .stats-filter-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stats-field, .stats-field--name { flex-basis: auto; }
  .stats-filter-fields > .tfm-button { width: 100%; }
  .stats-kpi { padding: 16px; }
  .stats-record-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stats-refresh-banner, .stats-inline-error { align-items: flex-start; flex-direction: column; }
}
@media (prefers-reduced-motion: reduce) {
  .stats-loading i { animation: none; }
}
</style>
