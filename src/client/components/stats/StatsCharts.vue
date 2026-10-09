<template>
  <div class="stats-charts">
    <PortalPanel padding="normal" class="stats-chart-panel stats-chart-panel--trend">
      <template #header>
        <div class="stats-chart-heading">
          <div>
            <p class="stats-eyebrow" v-i18n>Activity</p>
            <h2 v-i18n>Daily activity</h2>
          </div>
          <span class="stats-chart-caption" v-i18n>Daily completed games (UTC)</span>
        </div>
      </template>
      <div v-if="dailyTrend.length > 0" class="stats-trend-wrap">
        <svg class="stats-trend" viewBox="0 0 720 230" preserveAspectRatio="none" role="img" :aria-label="$t('Daily activity chart')">
          <defs>
            <linearGradient id="stats-trend-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="var(--portal-accent)" stop-opacity=".3" />
              <stop offset="1" stop-color="var(--portal-accent)" stop-opacity="0" />
            </linearGradient>
          </defs>
          <line v-for="line in trendGridLines" :key="line" x1="0" :y1="line" x2="720" :y2="line" class="stats-trend__grid" />
          <path :d="trendAreaPath" class="stats-trend__area" />
          <polyline :points="trendPoints" class="stats-trend__line" />
          <circle
            v-for="(point, index) in trendPointList"
            :key="dailyTrend[index].day"
            :cx="point.x"
            :cy="point.y"
            r="3.5"
            class="stats-trend__point"
          ><title>{{ dailyTrend[index].day }} · {{ dailyTrend[index].games }} {{ $t('games') }}</title></circle>
          <text x="8" y="24" class="stats-trend__axis-label">{{ trendMaximum }} {{ $t('games') }}</text>
          <text x="8" y="223" class="stats-trend__axis-label">0</text>
        </svg>
        <div class="stats-chart-axis stats-chart-axis--trend">
          <span v-for="label in trendLabels" :key="label" class="stats-chart-axis__label">{{ label }}</span>
        </div>
        <div class="stats-legend">
          <span class="stats-legend__item"><i class="stats-legend__swatch stats-legend__swatch--accent"></i><span v-i18n>Games</span></span>
        </div>
      </div>
      <div v-else class="stats-chart-empty" v-i18n>No completed games in this range</div>
    </PortalPanel>

    <div class="stats-chart-grid">
      <PortalPanel padding="normal" class="stats-chart-panel">
        <template #header>
          <div class="stats-chart-heading">
            <div>
              <p class="stats-eyebrow" v-i18n>Distribution</p>
              <h2 v-i18n>Score histogram</h2>
            </div>
            <span class="stats-chart-caption" v-i18n>20-point intervals</span>
          </div>
        </template>
        <div v-if="overview.distribution.length > 0" class="stats-histogram" role="img" :aria-label="$t('Score distribution chart')">
          <div v-for="bucket in overview.distribution" :key="bucket.from + '-' + bucket.to" class="stats-histogram__bucket">
            <span class="stats-histogram__value">{{ bucket.count || '' }}</span>
            <div class="stats-histogram__bar-track">
              <div class="stats-histogram__bar" :style="{height: histogramHeight(bucket.count) + '%'}"></div>
            </div>
            <span class="stats-histogram__label">{{ bucket.from }}–{{ bucket.to - 1 }}</span>
          </div>
        </div>
        <div v-else class="stats-chart-empty" v-i18n>No score data in this range</div>
      </PortalPanel>

      <PortalPanel padding="normal" class="stats-chart-panel">
        <template #header>
          <div class="stats-chart-heading">
            <div>
              <p class="stats-eyebrow" v-i18n>Composition</p>
              <h2 v-i18n>Score sources</h2>
            </div>
            <span class="stats-chart-caption" v-i18n>Average points</span>
          </div>
        </template>
        <div v-if="scoreParts.length > 0" class="stats-composition">
          <div v-for="part in scoreParts" :key="part.key" class="stats-composition__row">
            <div class="stats-composition__label"><span>{{ $t(scorePartLabel(part.key)) }}</span><strong>{{ formatDecimal(part.average) }}</strong></div>
            <div class="stats-composition__track">
              <span class="stats-composition__zero" aria-hidden="true"></span>
              <div class="stats-composition__bar" :class="{'stats-composition__bar--negative': part.average < 0}" :style="scorePartStyle(part.average)"></div>
            </div>
          </div>
        </div>
        <div v-else class="stats-chart-empty" v-i18n>Score breakdown is not available</div>
      </PortalPanel>
    </div>

    <PortalPanel padding="normal" class="stats-chart-panel stats-chart-panel--boards">
      <template #header>
        <div class="stats-chart-heading">
          <div>
            <p class="stats-eyebrow" v-i18n>Tableau context</p>
            <h2 v-i18n>Board distribution</h2>
          </div>
          <span class="stats-chart-caption" v-i18n>Games and generations</span>
        </div>
      </template>
      <div v-if="boards.length > 0" class="stats-boards">
        <div v-for="board in boards" :key="board.name" class="stats-boards__row">
          <div class="stats-boards__copy">
            <span class="stats-boards__name">{{ $t(board.name) }}</span>
            <span class="stats-boards__meta">{{ board.games }} <span v-i18n>games</span> · {{ formatDecimal(board.avgGenerations) }} <span v-i18n>average generations</span></span>
          </div>
          <div class="stats-boards__track"><div class="stats-boards__bar" :style="{width: boardWidth(board.games) + '%'}"></div></div>
          <strong class="stats-boards__count">{{ board.games }}</strong>
        </div>
      </div>
      <div v-else class="stats-chart-empty" v-i18n>No board data in this range</div>
    </PortalPanel>
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';
import PortalPanel from '@/client/components/common/PortalPanel.vue';
import {StatsOverview} from '@/common/models/StatsModel';
import {getPreferences} from '@/client/utils/PreferencesManager';

interface TrendPoint {
  x: number;
  y: number;
}

interface DailyTrend {
  day: string;
  games: number;
  avgScore: number;
  wins: number;
  playerEntries: number;
}

export default defineComponent({
  name: 'StatsCharts',
  components: {PortalPanel},
  props: {
    overview: {type: Object as PropType<StatsOverview>, required: true},
  },
  computed: {
    dailyTrend(): DailyTrend[] {
      const trendByDay = new Map(this.overview.trend.map((point) => [point.day, point]));
      const from = new Date(this.overview.from);
      const to = new Date(Math.max(this.overview.from, this.overview.to - 1));
      const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
      const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
      const days = Math.floor((end - start) / 86_400_000) + 1;
      if (!Number.isFinite(days) || days <= 0 || days > 366) {
        return this.overview.trend;
      }
      const result: DailyTrend[] = [];
      for (let index = 0; index < days; index++) {
        const day = new Date(start + (index * 86_400_000)).toISOString().slice(0, 10);
        result.push(trendByDay.get(day) ?? {day, games: 0, avgScore: 0, wins: 0, playerEntries: 0});
      }
      return result;
    },
    trendMaximum(): number {
      const games = this.dailyTrend.map((point) => point.games);
      return Math.max(1, ...games);
    },
    trendPointList(): TrendPoint[] {
      const count = this.dailyTrend.length;
      const denominator = Math.max(1, count - 1);
      return this.dailyTrend.map((point, index) => ({
        x: count === 1 ? 360 : (index / denominator) * 720,
        y: 205 - (point.games / this.trendMaximum) * 170,
      }));
    },
    trendPoints(): string {
      return this.trendPointList.map((point) => `${point.x},${point.y}`).join(' ');
    },
    trendAreaPath(): string {
      const points = this.trendPointList;
      if (points.length === 0) {
        return '';
      }
      const line = points.map((point) => `${point.x},${point.y}`).join(' L ');
      return `M ${points[0].x},205 L ${line} L ${points[points.length - 1].x},205 Z`;
    },
    trendGridLines(): number[] {
      return [35, 92, 149, 205];
    },
    trendLabels(): string[] {
      const trend = this.dailyTrend;
      if (trend.length === 0) {
        return [];
      }
      const indexes = trend.length <= 4 ? trend.map((_point, index) => index) : [0, Math.floor((trend.length - 1) / 2), trend.length - 1];
      return indexes.map((index) => this.formatTrendDate(trend[index].day));
    },
    distributionMaximum(): number {
      return Math.max(1, ...this.overview.distribution.map((bucket) => bucket.count));
    },
    scoreParts(): Array<{key: string; average: number}> {
      return this.overview.scoreParts.filter((part) => Number.isFinite(part.average));
    },
    scorePartsExtent(): number {
      return Math.max(1, ...this.scoreParts.map((part) => Math.abs(part.average)));
    },
    boards(): Array<{name: string; games: number; avgGenerations: number}> {
      return [...this.overview.boards].sort((a, b) => b.games - a.games);
    },
    boardsMaximum(): number {
      return Math.max(1, ...this.boards.map((board) => board.games));
    },
  },
  methods: {
    scorePartLabel(key: string): string {
      return {
        tr: 'TR',
        cards: 'Card VP',
        greenery: 'Greenery',
        city: 'Cities',
        milestones: 'Milestones',
        awards: 'Awards',
        other: 'Other',
      }[key] ?? key;
    },
    histogramHeight(count: number): number {
      return Math.max(2, (count / this.distributionMaximum) * 100);
    },
    scorePartStyle(average: number): Record<string, string> {
      const width = Math.max(1, (Math.abs(average) / this.scorePartsExtent) * 50);
      return average < 0 ? {right: '50%', width: `${width}%`} : {left: '50%', width: `${width}%`};
    },
    boardWidth(games: number): number {
      return Math.max(2, (games / this.boardsMaximum) * 100);
    },
    formatTrendDate(day: string): string {
      const date = new Date(`${day}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) {
        return day.slice(5);
      }
      const browserLanguage = typeof navigator === 'undefined' ? 'en-US' : navigator.language;
      const language = getPreferences().lang || browserLanguage;
      const locale = language === 'cn' ? 'zh-CN' : language;
      return date.toLocaleDateString(locale, {month: '2-digit', day: '2-digit', timeZone: 'UTC'});
    },
    formatDecimal(value: number): string {
      return Number.isFinite(value) ? value.toFixed(1) : '—';
    },
  },
});
</script>

<style scoped>
.stats-trend__axis-label { fill: var(--portal-muted); font-size: 12px; }
.stats-charts { display: grid; gap: 16px; }
.stats-chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.stats-chart-panel { min-width: 0; overflow: hidden; }
.stats-chart-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.stats-chart-heading h2 { margin: 2px 0 0; color: var(--portal-text); font-size: 17px; line-height: 1.3; }
.stats-eyebrow { margin: 0; color: var(--portal-accent); font: 700 10px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .16em; text-transform: uppercase; }
.stats-chart-caption { color: var(--portal-muted); font-size: 12px; line-height: 1.5; text-align: right; }
.stats-trend-wrap { min-width: 0; }
.stats-trend { display: block; width: 100%; height: 230px; margin: 4px 0 0; overflow: visible; }
.stats-trend__grid { stroke: var(--portal-border); stroke-dasharray: 3 7; stroke-width: 1; }
.stats-trend__area { fill: url(#stats-trend-fill); }
.stats-trend__line { fill: none; stroke: var(--portal-accent); stroke-linecap: round; stroke-linejoin: round; stroke-width: 3; }
.stats-trend__line--score { stroke: #53c8d7; stroke-width: 2; stroke-dasharray: 5 5; }
.stats-trend__point { fill: var(--portal-surface); stroke: var(--portal-accent); stroke-width: 2; }
.stats-chart-axis { display: flex; justify-content: space-between; gap: 8px; color: var(--portal-muted); font: 11px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace; }
.stats-chart-axis--trend { padding: 0 2px; }
.stats-legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 16px; color: var(--portal-muted); font-size: 12px; }
.stats-legend__item { display: inline-flex; align-items: center; gap: 7px; }
.stats-legend__swatch { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.stats-legend__swatch--accent { background: var(--portal-accent); }
.stats-legend__swatch--cyan { background: #53c8d7; }
.stats-chart-empty { min-height: 132px; display: grid; place-items: center; color: var(--portal-muted); font-size: 13px; text-align: center; }
.stats-histogram { display: flex; align-items: flex-end; gap: 3px; min-width: 0; height: 180px; padding-top: 12px; }
.stats-histogram__bucket { display: flex; flex: 1 1 0; flex-direction: column; align-items: center; justify-content: flex-end; min-width: 0; height: 100%; }
.stats-histogram__value { min-height: 16px; color: var(--portal-muted); font: 10px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; }
.stats-histogram__bar-track { display: flex; align-items: flex-end; width: 100%; height: 130px; }
.stats-histogram__bar { width: 100%; min-height: 2px; border-radius: 4px 4px 1px 1px; background: linear-gradient(180deg, var(--portal-accent), rgba(244,129,70,.25)); transition: height .25s ease; }
.stats-histogram__label { width: 100%; margin-top: 8px; overflow: hidden; color: var(--portal-muted); font: 9px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; text-align: center; text-overflow: clip; white-space: nowrap; }
.stats-composition { display: grid; gap: 15px; padding: 4px 0; }
.stats-composition__row { display: grid; gap: 7px; }
.stats-composition__label { display: flex; justify-content: space-between; gap: 10px; color: var(--portal-muted); font-size: 12px; }
.stats-composition__label strong { color: var(--portal-text); font: 600 12px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace; }
.stats-composition__track, .stats-boards__track { height: 8px; overflow: hidden; border-radius: 999px; background: rgba(164,185,213,.12); }
.stats-composition__track { position: relative; }
.stats-composition__zero { position: absolute; top: -2px; bottom: -2px; left: 50%; width: 1px; background: rgba(241,245,249,.4); }
.stats-composition__bar { position: absolute; top: 0; bottom: 0; border-radius: inherit; background: linear-gradient(90deg, #53c8d7, #a8e3e8); }
.stats-composition__bar--negative { background: linear-gradient(90deg, #e79a83, #f4c0a4); }
.stats-boards { display: grid; gap: 15px; }
.stats-boards__row { display: grid; grid-template-columns: minmax(115px, 1fr) minmax(100px, 1.6fr) auto; align-items: center; gap: 12px; }
.stats-boards__copy { display: grid; gap: 3px; min-width: 0; }
.stats-boards__name { overflow: hidden; color: var(--portal-text); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.stats-boards__meta { color: var(--portal-muted); font-size: 11px; white-space: nowrap; }
.stats-boards__bar { height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--portal-accent), #f3b66f); }
.stats-boards__count { color: var(--portal-text); font: 600 13px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; }
@media (max-width: 760px) {
  .stats-chart-grid { grid-template-columns: 1fr; }
  .stats-boards__row { grid-template-columns: minmax(100px, 1fr) minmax(70px, 1.2fr) auto; }
}
@media (prefers-reduced-motion: reduce) {
  .stats-histogram__bar { transition: none; }
}
</style>
