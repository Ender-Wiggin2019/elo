<template>
  <div class="ranks-page portal-page portal-enter">
    <div class="ranks-content">
      <header class="ranks-header">
        <div class="ranks-title-row">
          <h1 class="portal-heading ranks-heading" v-i18n>Ranking</h1>
        </div>
        <div class="ranks-season-bar">
          <div class="ranks-season-copy">
            <span class="ranks-season-label" v-i18n>Season:</span>
            <span class="ranks-season-name">{{ seasonInfo ? seasonInfo.seasonName : '--' }}</span>
            <span v-if="seasonInfo" class="ranks-season-dates">{{ formatSeasonDateTime(seasonInfo.startDate) }} ~ {{ formatSeasonDateTime(seasonInfo.endDate) }}</span>
            <span v-if="!isCurrentSeason" class="ranks-season-status">Final Snapshot</span>
          </div>
          <div class="ranks-season-switcher">
            <button class="ranks-season-button"
                    :class="{'ranks-season-button--active': isCurrentSeason}"
                    :aria-pressed="isCurrentSeason"
                    :disabled="isLoadingLeaderboard"
                    @click="viewCurrentSeason"
                    v-i18n
            >
              Current Season
            </button>
            <button class="ranks-season-button"
                    :class="{'ranks-season-button--active': !isCurrentSeason && seasonList?.previousSeasonId}"
                    :aria-pressed="!isCurrentSeason"
                    :disabled="isLoadingLeaderboard || !seasonList?.previousSeasonId"
                    @click="viewPreviousSeason"
                    v-i18n
            >
              Previous Season
            </button>
          </div>
        </div>
      </header>

      <PortalTabs v-model="openTab" :items="[{id: 1, label: 'Leaderboard'}, {id: 2, label: 'Rank Rules'}, {id: 3, label: 'Rank Tiers'}]" />

      <div v-if="openTab === 1" class="ranks-view ranks-view--leaderboard">
        <div v-if="isLoadingLeaderboard" class="ranks-loading" role="status" v-i18n>Loading leaderboard...</div>
        <div v-if="leaderboardError" class="ranks-error" role="alert">
          <span v-i18n>Error getting ranking data</span>
          <button type="button" class="ranks-season-button" @click="retryLeaderboard" v-i18n>Retry</button>
        </div>
        <template v-if="allUserRanks.length > 0 || (!isLoadingLeaderboard && !leaderboardError)">
          <div v-if="allUserRanks.length >= 3" class="ranks-podium-list">
            <div class="ranks-podium ranks-podium--silver">
              <div class="ranks-podium__crown" aria-hidden="true">&#9733;</div>
              <div class="ranks-podium__card ranks-podium__card--silver">
                <div class="ranks-podium__rank">#{{ getDisplayRank(allUserRanks[1], 1) }}</div>
                <a :href="'/user/' + encodeURIComponent(allUserRanks[1].userName)" class="ranks-podium__name">{{ allUserRanks[1].userName }}</a>
                <div class="ranks-podium__tier"><RankTier :rankTier="allUserRanks[1].userTier" :showNumber="false"/></div>
              </div>
            </div>

            <div class="ranks-podium ranks-podium--gold">
              <div class="ranks-podium__crown" aria-hidden="true">&#9813;</div>
              <div class="ranks-podium__card ranks-podium__card--gold">
                <div class="ranks-podium__rank">#{{ getDisplayRank(allUserRanks[0], 0) }}</div>
                <a :href="'/user/' + encodeURIComponent(allUserRanks[0].userName)" class="ranks-podium__name">{{ allUserRanks[0].userName }}</a>
                <div class="ranks-podium__tier"><RankTier :rankTier="allUserRanks[0].userTier" :showNumber="false"/></div>
              </div>
            </div>

            <div class="ranks-podium ranks-podium--bronze">
              <div class="ranks-podium__crown" aria-hidden="true">&#9733;</div>
              <div class="ranks-podium__card ranks-podium__card--bronze">
                <div class="ranks-podium__rank">#{{ getDisplayRank(allUserRanks[2], 2) }}</div>
                <a :href="'/user/' + encodeURIComponent(allUserRanks[2].userName)" class="ranks-podium__name">{{ allUserRanks[2].userName }}</a>
                <div class="ranks-podium__tier"><RankTier :rankTier="allUserRanks[2].userTier" :showNumber="false"/></div>
              </div>
            </div>
          </div>

          <div v-if="allUserRanks.length >= 3" class="ranks-mobile-podium-list">
            <div v-for="idx in [0, 1, 2]" :key="'top-' + idx" class="ranks-mobile-podium-row" :class="'ranks-mobile-podium-row--' + idx">
              <div class="ranks-mobile-podium-rank">#{{ getDisplayRank(allUserRanks[idx], idx) }}</div>
              <a :href="'/user/' + encodeURIComponent(allUserRanks[idx].userName)" class="ranks-mobile-podium-name">
                {{ allUserRanks[idx].userName }}
              </a>
              <div class="ranks-mobile-podium-tier">
                <RankTier :rankTier="allUserRanks[idx].userTier" :showNumber="false"/>
              </div>
            </div>
          </div>

          <div class="ranks-panel portal-panel">
            <div class="ranks-table-wrap">
              <table class="ranks-table">
                <thead>
                  <tr>
                    <th class="ranks-table__rank" v-i18n>Rank</th>
                    <th v-i18n>User Name</th>
                    <th class="ranks-table__tier" v-i18n>Tier</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(singleUserRank, index) in tableRanks"
                      :key="singleUserRank.userName + '-' + index"
                  >
                    <td class="ranks-table__rank">{{ getDisplayRank(singleUserRank, index + (allUserRanks.length >= 3 ? 3 : 0)) }}</td>
                    <td class="ranks-table__name"><a :href="'/user/' + encodeURIComponent(singleUserRank.userName)">{{ singleUserRank.userName }}</a></td>
                    <td><RankTier :rankTier="singleUserRank.userTier" :showNumber="false"/></td>
                  </tr>
                </tbody>
              </table>
              <div v-if="!isLoadingLeaderboard && tableRanks.length === 0" class="ranks-empty-state" v-i18n>No additional rankings</div>
            </div>
          </div>
        </template>
      </div>

      <div v-if="openTab === 2" class="ranks-view ranks-view--rules">
        <div class="ranks-panel portal-panel">
          <div class="ranks-panel__eyebrow" v-i18n>Star Change per Placement</div>
          <div class="ranks-rule-list">
            <div v-for="p in ['2', '3', '4', '5']" :key="p" class="ranks-rule-row">
              <span class="ranks-rule-badge">
                {{ p }}P
              </span>
              <div class="ranks-rule-copy">
                <span v-if="p === '2'" v-i18n>First player + 1, second player -1.</span>
                <span v-if="p === '3'" v-i18n>First player + 1, second player +0, third player -1.</span>
                <span v-if="p === '4'" v-i18n>First player + 2, second player +1, third player +0, fourth player -1.</span>
                <span v-if="p === '5'" v-i18n>First player + 2, second player +1, third player +0, fourth player -1, fifth player -2.</span>
              </div>
            </div>
          </div>

          <div class="ranks-rule-note">
            <span class="ranks-rule-note__icon" aria-hidden="true">&#9432;</span>
            <span v-i18n>Iron, Bronze, Silver tier players will not lose stars on demotion.</span>
          </div>
        </div>
      </div>

      <div v-if="openTab === 3" class="ranks-view ranks-view--tiers">
        <div class="ranks-tiers-grid">
          <div v-for="(rankTier, idx) in rankTiers"
               :key="rankTier.name"
               class="ranks-tier-card"
               :style="getTierCardStyle(rankTier, idx)"
          >
            <div class="ranks-tier-card__body">
              <div class="ranks-tier-card__asset">
                <RankTier :rankTier="rankTier" :showNumber="false"/>
              </div>

              <div class="ranks-tier-card__copy">
                <div class="ranks-tier-card__title">
                  <span class="ranks-tier-card__name" v-i18n>{{ rankTier.name }}</span>
                  <span v-if="rankTier.measurement === 'star'" class="ranks-tier-card__measure">{{ rankTier.maxStars }} &#9733;</span>
                  <span v-else class="ranks-tier-card__measure ranks-tier-card__measure--score">SCORE</span>
                </div>
                <div class="ranks-tier-card__description">
                  <span v-if="rankTier.measurement === 'value'">
                    最高段位 · <a href="https://www.microsoft.com/en-us/research/project/trueskill-ranking-system/" class="ranks-tier-card__link">TrueSkill</a> 算法排名
                  </span>
                  <span v-else-if="rankTier.maxStars <= 3" v-i18n>Protected — no star loss on defeat</span>
                  <span v-else v-i18n>Stars can be lost on defeat</span>
                </div>
              </div>

              <div class="ranks-tier-card__level">
                <div class="ranks-tier-card__level-label">Lv</div>
                <div class="ranks-tier-card__level-value">{{ idx + 1 }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import './Ranks.css';
import {getTierColor} from '../utils/rankUtils';
import {showError} from '../utils/showAlert';
import {seasonService, rankService} from '../services';
import PortalTabs from './common/PortalTabs.vue';
import RankTier from '@/client/components/RankTier.vue';
import {RankTiers} from '../../common/rank/RankTiers';

const RANK_LIMIT = 100;

export default defineComponent({
  name: 'Ranks',
  components: {
    PortalTabs,
    RankTier,
  },
  data() {
    return {
      allUserRanks: [] as any[],
      openTab: 1,
      rankTiers: RankTiers,
      seasons: [] as Array<{seasonId: string; seasonName: string; startDate: string; endDate: string}>,
      seasonList: undefined as undefined | {currentSeasonId: string; previousSeasonId?: string},
      selectedSeasonId: '',
      isCurrentSeason: true,
      isLoadingLeaderboard: true,
      leaderboardError: false,
      failedSeasonId: '',
      leaderboardCache: {} as Record<string, {allUserRanks: any[]; isCurrentSeason: boolean}>,
    };
  },
  computed: {
    tableRanks(): any[] {
      return this.allUserRanks.length >= 3 ? this.allUserRanks.slice(3) : this.allUserRanks;
    },
    seasonInfo(): {seasonId: string; seasonName: string; startDate: string; endDate: string} | undefined {
      if (!this.selectedSeasonId || this.seasons.length === 0) {
        return undefined;
      }
      return this.seasons.find((s: any) => s.seasonId === this.selectedSeasonId);
    },
  },
  mounted() {
    this.loadSeasonData();
  },
  methods: {
    loadSeasonData() {
      seasonService.getSeasonInfo()
        .then((data) => {
          this.seasons = data.seasons || [];
        })
        .catch(() => {
          showError('Error loading season info');
        });

      seasonService.getSeasonList()
        .then((data) => {
          this.seasonList = data;
          this.selectedSeasonId = data.currentSeasonId;
          this.isCurrentSeason = true;
          this.loadLeaderboard(this.selectedSeasonId);
        })
        .catch(() => {
          this.loadLegacyLeaderboard();
        });
    },
    loadLegacyLeaderboard() {
      this.isLoadingLeaderboard = true;
      this.leaderboardError = false;
      this.failedSeasonId = '';
      rankService.getLeaderboard(RANK_LIMIT)
        .then((result) => {
          if (result && result.allUserRanks && result.allUserRanks instanceof Array) {
            this.allUserRanks = result.allUserRanks;
          } else {
            this.leaderboardError = true;
          }
        })
        .catch(() => {
          this.leaderboardError = true;
        })
        .finally(() => {
          this.isLoadingLeaderboard = false;
        });
    },
    loadLeaderboard(seasonId: string) {
      this.leaderboardError = false;
      this.failedSeasonId = seasonId;
      if (this.leaderboardCache[seasonId]) {
        const cached = this.leaderboardCache[seasonId];
        this.allUserRanks = cached.allUserRanks;
        this.selectedSeasonId = seasonId;
        this.isCurrentSeason = cached.isCurrentSeason;
        this.isLoadingLeaderboard = false;
        return;
      }

      this.isLoadingLeaderboard = true;
      const querySeasonId = seasonId || (this.seasonInfo ? this.seasonInfo.seasonId : '');
      seasonService.getLeaderboard(querySeasonId, RANK_LIMIT)
        .then((result) => {
          if (result && result.allUserRanks && result.allUserRanks instanceof Array) {
            this.allUserRanks = result.allUserRanks;
            this.selectedSeasonId = result.seasonId || querySeasonId;
            this.isCurrentSeason = result.isCurrentSeason === true;
            this.leaderboardCache[querySeasonId] = {
              allUserRanks: result.allUserRanks,
              isCurrentSeason: result.isCurrentSeason === true,
            };
          } else {
            this.leaderboardError = true;
          }
        })
        .catch(() => {
          this.leaderboardError = true;
        })
        .finally(() => {
          this.isLoadingLeaderboard = false;
        });
    },
    retryLeaderboard() {
      if (this.failedSeasonId) {
        this.loadLeaderboard(this.failedSeasonId);
      } else {
        this.loadLegacyLeaderboard();
      }
    },
    viewPreviousSeason() {
      if (this.isLoadingLeaderboard) {
        return;
      }
      const previousSeasonId = this.seasonList?.previousSeasonId || '';
      if (!previousSeasonId) {
        return;
      }
      this.loadLeaderboard(previousSeasonId);
    },
    viewCurrentSeason() {
      if (this.isLoadingLeaderboard) {
        return;
      }
      const currentSeasonId = this.seasonList?.currentSeasonId || this.seasonInfo?.seasonId || '';
      if (!currentSeasonId) {
        return;
      }
      this.loadLeaderboard(currentSeasonId);
    },
    formatSeasonDateTime(isoDate: string | undefined): string {
      if (!isoDate) {
        return '';
      }
      const date = new Date(isoDate);
      return date.toLocaleString();
    },
    getDisplayRank(singleUserRank: any, index: number): number {
      return singleUserRank.finalPosition || index + 1;
    },
    getTierColor(rankTier: any): string {
      return getTierColor(rankTier.name);
    },
    getTierCardStyle(rankTier: any, _idx: number): Record<string, string> {
      const color = getTierColor(rankTier.name);
      return {
        '--tier-color': color,
      };
    },
  },
});
</script>
