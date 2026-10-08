<template>
  <div class="profile-page portal-page portal-enter" :class="{ 'profile-page--vip': isVip }">
    <div class="profile-container">
      <!-- Loading State -->
      <PortalPanel v-if="loading" padding="normal" class="profile-loading">
        <div class="profile-loading__spinner"></div>
        <span v-i18n>Loading profile...</span>
      </PortalPanel>

      <!-- Error State -->
      <PortalEmptyState v-else-if="error" title="Unable to load profile" :description="error">
        <TfmButton href="/" variant="outline"><span v-i18n>Back to Home</span></TfmButton>
      </PortalEmptyState>

      <!-- Profile Content -->
      <template v-else-if="profile">
        <!-- Profile Header Card -->
        <PortalPanel padding="normal" class="profile-header">
          <div class="profile-header__content">
            <UserIdentity
              :name="profile.name"
              :vip="isVip"
              :rankTier="profile.rank ? rankTierObj : null"
              :rankLabel="profile.rank ? '' : 'Unranked'"
              :rankVertical="true"
              size="lg"
            >
              <template #detail v-if="profile.createtime">
                <span v-i18n>Joined</span> {{ formattedJoinDate }}
              </template>
            </UserIdentity>
          </div>
        </PortalPanel>

        <!-- Stats Overview -->
        <div class="profile-stats">
          <PortalPanel padding="compact" class="profile-stat">
            <div class="profile-stat__value">
              {{ profile.totalGames }}
            </div>
            <div class="profile-stat__label" v-i18n>Games</div>
          </PortalPanel>
          <PortalPanel padding="compact" class="profile-stat" :class="winRateClass">
            <div class="profile-stat__value">
              {{ allTimeWinRate }}<span class="profile-stat__unit">%</span>
            </div>
            <div class="profile-stat__label" v-i18n>Win Rate</div>
          </PortalPanel>
          <PortalPanel padding="compact" class="profile-stat" :class="fleeRateClass">
            <div class="profile-stat__value">
              {{ allTimeFleeRate }}<span class="profile-stat__unit">%</span>
            </div>
            <div class="profile-stat__label" v-i18n>Flee Rate</div>
          </PortalPanel>
        </div>

        <!-- Game Stats Section -->
        <div class="profile-section" v-if="profile.gameStats">
          <PortalPageHeader title="Game Stats" />
          <PortalPanel padding="none" class="profile-card">
            <UserGameStats
              :allTime="profile.gameStats.allTime"
              :recent3Months="profile.gameStats.recent3Months"
            />
          </PortalPanel>
        </div>

      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import {RankTier} from '@/common/rank/RankTier';
import UserIdentity from '@/client/components/common/UserIdentity.vue';
import UserGameStats from '@/client/components/common/UserGameStats.vue';
import PortalPageHeader from '@/client/components/common/PortalPageHeader.vue';
import PortalPanel from '@/client/components/common/PortalPanel.vue';
import PortalEmptyState from '@/client/components/common/PortalEmptyState.vue';
import TfmButton from '@/client/components/common/TfmButton.vue';
import {userService, UserProfile as IProfile} from '@/client/services';

export default defineComponent({
  name: 'UserProfile',
  components: {
    UserIdentity,
    UserGameStats,
    PortalPageHeader,
    PortalPanel,
    PortalEmptyState,
    TfmButton,
  },
  props: {
    identifier: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      loading: true,
      error: '' as string,
      profile: null as IProfile | null,
    };
  },
  computed: {
    formattedJoinDate(): string {
      if (!this.profile?.createtime) {
        return '';
      }
      const date = new Date(this.profile.createtime);
      const lang = navigator.language || 'en-US';
      return date.toLocaleDateString(lang, {year: 'numeric', month: 'long', day: 'numeric'});
    },
    isVip(): boolean {
      return this.profile ? this.profile.isvip > 0 : false;
    },
    rankTierObj(): RankTier {
      const t = this.profile!.rank!.tier;
      return new RankTier(
        t.name as any,
        t.measurement as 'star' | 'value',
        t.maxStars,
        t.stars,
        t.value,
      );
    },
    allTimeWinRate(): number {
      return this.profile?.gameStats?.allTime?.winRate ?? 0;
    },
    allTimeFleeRate(): number {
      return this.profile?.gameStats?.allTime?.fleeRate ?? 0;
    },
    winRateClass(): string {
      const rate = this.allTimeWinRate;
      if (rate >= 50) {
        return 'profile-stat--success';
      }
      if (rate >= 40) {
        return 'profile-stat--warn';
      }
      return '';
    },
    fleeRateClass(): string {
      const rate = this.allTimeFleeRate;
      if (rate > 20) {
        return 'profile-stat--danger';
      }
      if (rate > 10) {
        return 'profile-stat--warn';
      }
      return '';
    },
  },
  mounted() {
    this.fetchProfile();
  },
  watch: {
    identifier() {
      this.fetchProfile();
    },
  },
  methods: {
    fetchProfile() {
      this.loading = true;
      this.error = '';
      this.profile = null;

      userService.getUserProfile(this.identifier)
        .then((data) => {
          this.profile = data;
        })
        .catch((err: Error) => {
          this.error = err.message || 'Failed to load profile';
        })
        .finally(() => {
          this.loading = false;
        });
    },
  },
});
</script>

<style scoped>
.profile-page {
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  width: 100%;
}

.profile-container {
  margin: 0 auto;
  max-width: 800px;
  width: 100%;
}

.profile-loading {
  color: var(--portal-muted, #a6b3c7);
  font-size: 13px;
  text-align: center;
}

.profile-loading__spinner {
  animation: profile-spin 1s linear infinite;
  border: 3px solid rgba(164, 185, 213, .16);
  border-radius: 50%;
  border-top-color: var(--portal-accent, #f48146);
  height: 32px;
  margin: 0 auto 14px;
  width: 32px;
}

@keyframes profile-spin {
  to { transform: rotate(360deg); }
}

/* Header */
.profile-header {
  margin-bottom: 20px;
}

.profile-header__content {
  min-width: 0;
}

/* Summary metrics */
.profile-stats {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 28px;
}

.profile-stat {
  min-width: 0;
  text-align: center;
}

.profile-stat--success .profile-stat__value {
  color: #2dd4bf;
}

.profile-stat--warn .profile-stat__value {
  color: #f59e0b;
}

.profile-stat--danger .profile-stat__value {
  color: #ef4444;
}

.profile-stat__value {
  color: var(--portal-text, #f1f5f9);
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 6px;
}

.profile-stat__unit {
  font-size: 16px;
  opacity: .7;
}

.profile-stat__label {
  color: var(--portal-muted, #a6b3c7);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .02em;
}

/* Detailed stats */
.profile-section {
  margin-bottom: 24px;
}

.profile-card {
  overflow: hidden;
}

@media (max-width: 640px) {
  .profile-stats {
    gap: 10px;
  }

  .profile-stat__value {
    font-size: 22px;
  }
}

@media (max-width: 480px) {
  .profile-stat__label {
    font-size: 9px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .profile-loading__spinner {
    animation: none;
  }
}
</style>
