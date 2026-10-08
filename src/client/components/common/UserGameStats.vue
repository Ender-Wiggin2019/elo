<template>
  <div class="ugs-root">
    <!-- Period toggle -->
    <div class="ugs-period-toggle">
      <PortalTabs v-model="period" :items="[{id: 'allTime', label: 'All Time'}, {id: 'recent3Months', label: 'Last 3 Months'}]" />
    </div>

    <!-- Hero metrics row: Win Rate + Flee Rate -->
    <div class="ugs-hero">
      <div class="ugs-hero__cell">
        <div class="ugs-hero__label" v-i18n>Win Rate</div>
        <div class="ugs-hero__value" :class="activeStats.winRate >= 50 ? 'ugs-hero__value--good' : 'ugs-hero__value--warn'">
          {{ activeStats.winRate }}<span class="ugs-hero__unit">%</span>
        </div>
        <div class="ugs-hero__sub">{{ activeStats.wins }}W / {{ activeStats.losses }}L</div>
      </div>
      <div class="ugs-hero__divider"></div>
      <div class="ugs-hero__cell" :class="{'ugs-hero__cell--danger': activeStats.fleeRate > 10}">
        <div class="ugs-hero__label" v-i18n>Flee Rate</div>
        <div class="ugs-hero__value" :class="fleeRateClass">
          {{ activeStats.fleeRate }}<span class="ugs-hero__unit">%</span>
        </div>
        <div class="ugs-hero__sub" :class="activeStats.fleeRate > 10 ? 'text-red-400/70' : ''">
          {{ activeStats.fleeCount }} <span v-i18n>fled</span> / {{ activeStats.totalGames }} <span v-i18n>total</span>
        </div>
        <div v-if="activeStats.fleeRate > 20" class="ugs-flee-badge">
          <span class="ugs-flee-badge__icon">&#9888;</span>
          <span v-i18n>High flee rate</span>
        </div>
      </div>
    </div>

    <!-- Detailed grid -->
    <div class="ugs-grid">
      <div class="ugs-cell">
        <div class="ugs-cell__label" v-i18n>Games Played</div>
        <div class="ugs-cell__value">{{ activeStats.totalGames }}</div>
      </div>
      <div class="ugs-cell">
        <div class="ugs-cell__label" v-i18n>Avg Score</div>
        <div class="ugs-cell__value text-mars-cyan">{{ activeStats.avgScore }}</div>
      </div>
      <div class="ugs-cell">
        <div class="ugs-cell__label" v-i18n>Avg Position</div>
        <div class="ugs-cell__value">#{{ activeStats.avgPosition }}</div>
      </div>
      <div class="ugs-cell">
        <div class="ugs-cell__label" v-i18n>Ranked Games</div>
        <div class="ugs-cell__value text-mars-amber">{{ activeStats.totalRankGames }}
          <span class="text-xs text-mars-text-faint ml-1">W:{{ activeStats.rankWins }}</span>
        </div>
      </div>
      <div class="ugs-cell">
        <div class="ugs-cell__label" v-i18n>Casual Games</div>
        <div class="ugs-cell__value text-mars-text-dim">{{ activeStats.totalGames - activeStats.totalRankGames }}</div>
      </div>
      <div class="ugs-cell">
        <div class="ugs-cell__label" v-i18n>Wins</div>
        <div class="ugs-cell__value text-mars-teal">{{ activeStats.wins }}
          <span class="text-xs text-mars-text-faint ml-1">L:{{ activeStats.losses }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';
import {GameStatsBlock} from '@/client/services/types';
import PortalTabs from './PortalTabs.vue';

/**
 * Shared game stats display component.
 *
 * Used by both Me.vue (own profile) and UserProfile.vue (public profile).
 * Accepts the full IUserGameStats shape and handles period toggling internally.
 */
export default defineComponent({
  name: 'UserGameStats',
  components: {PortalTabs},
  props: {
    /** allTime stats block */
    allTime: {
      type: Object as PropType<GameStatsBlock>,
      required: true,
    },
    /** recent3Months stats block */
    recent3Months: {
      type: Object as PropType<GameStatsBlock>,
      required: true,
    },
  },
  data() {
    return {
      period: 'allTime' as 'allTime' | 'recent3Months',
    };
  },
  computed: {
    activeStats(): GameStatsBlock {
      return this.period === 'recent3Months' ? this.recent3Months : this.allTime;
    },
    fleeRateClass(): string {
      const rate = this.activeStats.fleeRate;
      if (rate > 20) {
        return 'ugs-hero__value--critical';
      }
      if (rate > 10) {
        return 'ugs-hero__value--danger';
      }
      if (rate > 5) {
        return 'ugs-hero__value--warn';
      }
      return 'ugs-hero__value--safe';
    },
  },
});
</script>

<style scoped>.ugs-grid {display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: var(--portal-border);}
/* === Period toggle === */
.ugs-period-toggle {padding: 14px 16px;border-bottom: 1px solid var(--portal-border);
}

/* === Hero metrics === */
.ugs-hero {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--portal-border);
}

.ugs-hero__cell {
  flex: 1;
  padding: 20px 16px;
  text-align: center;
  position: relative;
  transition: background 0.3s ease;
}

.ugs-hero__cell--danger {
  background: rgba(239,68,68,0.06);
}

.ugs-hero__divider {
  width: 1px;
  background: var(--portal-border);
}

.ugs-hero__label {
  font-size: 11px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: .02em;
  color: var(--portal-muted);
  font-family: inherit;
  margin-bottom: 8px;
}

.ugs-hero__value {
  font-size: 36px;
  font-weight: 800;
  font-family: monospace;
  line-height: 1;
  margin-bottom: 6px;
}

.ugs-hero__unit {
  font-size: 18px;
  opacity: 0.6;
  margin-left: 1px;
}

.ugs-hero__value--good {
  color: #2dd4bf;
}

.ugs-hero__value--warn {
  color: #f59e0b;
}

.ugs-hero__value--safe {
  color: #94a3b8;
}

.ugs-hero__value--danger {
  color: #f87171;
}

.ugs-hero__value--critical {
  color: #ef4444;
}

.ugs-hero__sub {
  font-size: 11px;
  font-family: monospace;
  color: var(--portal-muted);
  letter-spacing: 0.05em;
}

.ugs-flee-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 3px 10px;
  background: rgba(239,68,68,0.12);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: 2px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #ef4444;
  font-family: monospace;
}

.ugs-flee-badge__icon {
  font-size: 12px;
}

/* === Grid cells === */
.ugs-cell {
  background: var(--portal-surface);
  padding: 14px 12px;
  text-align: center;
}

.ugs-cell__label {
  font-size: 11px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: .02em;
  color: var(--portal-muted);
  font-family: inherit;
  margin-bottom: 6px;
}

.ugs-cell__value {
  font-size: 18px;
  font-weight: 700;
  font-family: monospace;
  color: #e2e8f0;
}

/* === Mobile === */
@media (max-width: 640px) {
  .ugs-hero__cell {
    padding: 14px 10px;
  }

  .ugs-hero__value {
    font-size: 28px;
  }

  .ugs-hero__unit {
    font-size: 14px;
  }

  .ugs-cell {
    padding: 10px 8px;
  }

  .ugs-cell__value {
    font-size: 15px;
  }

  .ugs-cell__label {
    font-size: 11px;
  }
}
@media (max-width: 640px) {.ugs-grid {grid-template-columns: repeat(2, minmax(0, 1fr));}}
</style>
