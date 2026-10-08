<template>
  <div class="me-page portal-page portal-enter" :class="{ 'me-page--vip': isVip }">
    <div class="me-container">
      <!-- Desktop Sidebar -->
      <aside class="me-sidebar">
        <div class="me-user-card" :class="{ 'me-user-card--vip': isVip }">
          <UserIdentity
            :name="userName"
            :vip="isVip"
            :rankTier="userRank.userId !== '' ? getTier() : null"
            :rankVertical="true"
            size="sm"
            layout="stacked"
          >
            <template #footer>
              <div v-if="userId" class="me-points-display" :class="{ 'me-points-display--vip': isVip }">
                <span class="me-points-display__value">{{ userPointsDisplay }}</span>
                <span class="me-points-display__label">PTS</span>
              </div>
            </template>
          </UserIdentity>
        </div>

        <PortalTabs v-model="activeSection" :items="navItems" layout="sidebar" />

        <!-- Logout -->
        <div class="me-sidebar__footer">
          <TfmButton variant="danger" size="sm" block @click="changeLogin"><span v-i18n>Logout</span></TfmButton>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="me-content">
        <!-- Not logged in -->
        <PortalEmptyState v-if="!userName" title="Please sign in to view your profile">
          <TfmButton href="/login" variant="primary"><span v-i18n>Sign In</span></TfmButton>
        </PortalEmptyState>

        <!-- Account Section -->
        <div v-else-if="activeSection === 'account'" class="me-section">
          <PortalPageHeader title="Account" />

          <PortalPanel padding="normal" class="me-account-card">
            <div class="me-account-card__grid">
              <div class="me-account-item">
                <span class="me-account-item__label" v-i18n>Username</span>
                <span class="me-account-item__value">{{ userName }}</span>
              </div>
              <div class="me-account-item" v-if="vipDate">
                <span class="me-account-item__label" v-i18n>Potato Expires</span>
                <span class="me-account-item__value me-account-item__value--vip">{{ vipDate }}</span>
              </div>
              <div class="me-account-item" v-if="createtime">
                <span class="me-account-item__label" v-i18n>Joined</span>
                <span class="me-account-item__value">{{ formattedJoinDate }}</span>
              </div>
              <div class="me-account-item" v-if="userRank.userId !== ''">
                <span class="me-account-item__label" v-i18n>Rank Tier</span>
                <div class="me-account-item__value">
                  <RankBadge :rankTier="getTier()" :showName="true" :vertical="false"/>
                </div>
              </div>
              <div class="me-account-item" v-else>
                <span class="me-account-item__label" v-i18n>Rank Status</span>
                <TfmButton variant="outline" size="sm" :loading="rankActivating" @click="activateRank"><span v-i18n>Activate Rank</span></TfmButton>
              </div>
            </div>
          </PortalPanel>
        </div>

        <!-- Stats Section -->
        <div v-else-if="activeSection === 'stats'" class="me-section">
          <PortalPageHeader title="Game Stats" />

          <PortalPanel v-if="gameStats" padding="none" class="me-card">
            <UserGameStats
              :allTime="gameStats.allTime"
              :recent3Months="gameStats.recent3Months"
            />
          </PortalPanel>
          <PortalPanel v-else padding="none" class="me-card me-stats-state">
            <PortalEmptyState
              v-if="statsError"
              title="Unable to load game stats"
              :description="statsError"
              role="alert"
            >
              <TfmButton variant="outline" :loading="statsLoading" @click="getUserStats">
                <span v-i18n>Retry</span>
              </TfmButton>
            </PortalEmptyState>
            <PortalEmptyState v-else-if="statsLoading" title="Loading stats..." />
            <PortalEmptyState v-else title="No game stats yet" />
          </PortalPanel>
        </div>

        <!-- Settings Section -->
        <div v-else-if="activeSection === 'settings'" class="me-section">
          <PortalPageHeader title="Settings" />

          <PortalPanel padding="none" class="me-settings-card">
            <confirm-dialog
              message="开启后其他玩家可以通过你的游戏链接查看你的手牌，但不能帮你操作"
              ref="showHand"
              @accept="confimUpdate"
              @dismiss="cancelUpdate"
            />
            <div class="me-settings-list">
              <label class="me-setting-item">
                <div class="me-setting-item__info">
                  <span class="me-setting-item__label" v-i18n>Sound notifications</span>
                </div>
                <div class="me-toggle">
                  <input type="checkbox" v-model="enable_sounds" @change="updateTips" class="me-toggle__input">
                  <span class="me-toggle__slider"></span>
                </div>
              </label>
              <label class="me-setting-item">
                <div class="me-setting-item__info">
                  <span class="me-setting-item__label" v-i18n>Show cards in hand to others</span>
                </div>
                <div class="me-toggle">
                  <input type="checkbox" v-model="showhandcards" @change="updateShowHandCards" class="me-toggle__input">
                  <span class="me-toggle__slider"></span>
                </div>
              </label>
            </div>
          </PortalPanel>
        </div>

        <!-- Games Section -->
        <div v-else-if="activeSection === 'games'" class="me-section">
          <PortalPageHeader title="My Games">
            <template #actions><span class="me-section__count">{{ games.length }}</span></template>
          </PortalPageHeader>

          <PortalPanel padding="none" class="me-games-card">
            <PortalEmptyState v-if="games.length === 0" title="No games yet" />
            <div v-else class="me-games-list">
              <div v-for="game in games" :key="game.id" class="me-game-item">
                <div class="me-game-item__main">
                  <span class="me-game-item__date">{{ game.createtime.slice(0, 16) }}</span>
                  <span class="me-game-item__players">{{ game.players.length }}P</span>
                </div>
                <div class="me-game-item__members">
                  <span
                    v-for="player in game.players"
                    :key="player.id"
                    class="me-game-item__player"
                    :class="'player_bg_color_'+ player.color"
                  >
                    <a :href="'/player?id=' + player.id">{{ player.name }}</a>
                  </span>
                </div>
                <div class="me-game-item__status">
                  <span v-if="isGameAbandon(game.phase)" class="me-status me-status--muted">Abandon</span>
                  <span v-else-if="isGameTimeOut(game.phase)" class="me-status me-status--danger">Timeout</span>
                  <a v-else-if="isGameEnd(game.phase)" :href="'/game?id='+game.id" target="_blank" class="me-status me-status--muted" v-i18n>Ended</a>
                  <a v-else :href="'/game?id='+game.id" target="_blank" class="me-status me-status--success" v-i18n>Running</a>
                </div>
              </div>
            </div>
          </PortalPanel>
        </div>
      </main>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import {Phase} from '@/common/Phase';
import ConfirmDialog from '@/client/components/common/ConfirmDialog.vue';
import RankBadge from '@/client/components/common/RankBadge.vue';
import UserIdentity from '@/client/components/common/UserIdentity.vue';
import UserGameStats from '@/client/components/common/UserGameStats.vue';
import PortalPageHeader from '@/client/components/common/PortalPageHeader.vue';
import PortalPanel from '@/client/components/common/PortalPanel.vue';
import PortalEmptyState from '@/client/components/common/PortalEmptyState.vue';
import PortalTabs from '@/client/components/common/PortalTabs.vue';
import TfmButton from '@/client/components/common/TfmButton.vue';
import {UserRank} from '@/common/rank/RankManager';
import {DEFAULT_MU, DEFAULT_RANK_VALUE, DEFAULT_SIGMA} from '@/common/rank/constants';
import {showError} from '@/client/utils/showAlert';
import {userService} from '@/client/services';
import {userStore, preferencesStore} from '@/client/stores';

export default defineComponent({
  name: 'MePage',
  components: {
    'confirm-dialog': ConfirmDialog,
    RankBadge,
    UserIdentity,
    UserGameStats,
    PortalPageHeader,
    PortalPanel,
    PortalEmptyState,
    PortalTabs,
    TfmButton,
  },
  data() {
    return {
      userId: '' as string,
      userName: '' as string,
      games: [] as Array<any>,
      vipDate: '' as string,
      createtime: '' as string,
      enable_sounds: false,
      showhandcards: false,
      userRank: new UserRank('', DEFAULT_RANK_VALUE, DEFAULT_MU, DEFAULT_SIGMA, 0),
      gameStats: null as any,
      statsLoading: false,
      statsError: '' as string,
      rankActivating: false,
      activeSection: 'account' as string,
      navItems: [
        {
          id: 'account',
          label: 'Account',
          icon: 'user',
        },
        {
          id: 'stats',
          label: 'Stats',
          icon: 'trophy',
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: 'settings',
        },
        {
          id: 'games',
          label: 'Games',
          icon: 'game',
        },
      ],
    };
  },
  computed: {
    isVip(): boolean {
      return Boolean(this.vipDate);
    },
    userPointsDisplay(): string {
      const points = this.userRank?.points || 0;
      return points.toLocaleString('en-US');
    },
    formattedJoinDate(): string {
      if (!this.createtime) {
        return '';
      }
      const date = new Date(this.createtime);
      const lang = navigator.language || 'en-US';
      return date.toLocaleDateString(lang, {year: 'numeric', month: 'long', day: 'numeric'});
    },
  },
  mounted() {
    this.userId = userStore.userId;
    this.userName = userStore.userName;
    this.enable_sounds = preferencesStore.get('enable_sounds');
    if (this.userId.length === 0) {
      window.location.replace('/login');
      return;
    }
    this.getGames();
    this.getUserRank();
    this.getUserStats();
    this.getProfile();
  },
  methods: {
    getTier() {
      return this.userRank.getTier();
    },
    getGames() {
      userService.getMyGames(this.userId)
        .then((result) => {
          if (result && result.mygames && result.mygames instanceof Array) {
            this.games = result.mygames;
            if (result.vipDate) {
              this.vipDate = result.vipDate;
            }
            this.showhandcards = result.showhandcards;
          }
        })
        .catch(() => {
          showError('Error getting games data');
        });
    },
    getUserRank() {
      if (this.userId === '') {
        return;
      }
      userService.getUserRankInstance(this.userId)
        .then((userRank) => {
          this.userRank = userRank;
        })
        .catch(() => {});
    },
    isGameTimeOut(gamePhase: string): boolean {
      return gamePhase === Phase.TIMEOUT;
    },
    isGameAbandon(gamePhase: string): boolean {
      return gamePhase === Phase.ABANDON;
    },
    isGameEnd(gamePhase: string): boolean {
      return gamePhase === Phase.END;
    },
    changeLogin() {
      this.userId = '';
      this.userName = '';
      this.vipDate = '';
      this.games = [];
      userStore.logout();
      window.location.href = '/';
    },
    updateTips() {
      preferencesStore.set('enable_sounds', this.enable_sounds);
    },
    updateShowHandCards() {
      if (this.showhandcards) {
        (this.$refs['showHand'] as any).show();
      } else {
        this.confimUpdate();
      }
    },
    cancelUpdate() {
      this.showhandcards = false;
    },
    confimUpdate() {
      const userId = userStore.userId;
      if (userId === undefined || userId === '') {
        return;
      }
      userService.updateShowHandCards(userId, this.showhandcards)
        .catch((error: any) => {
          showError(error);
        });
    },
    getUserStats() {
      if (!this.userId || this.statsLoading) {
        return;
      }
      this.statsLoading = true;
      return userService.getUserProfile(this.userId)
        .then((data) => {
          this.gameStats = data?.gameStats || null;
          this.statsError = '';
        })
        .catch((err: any) => {
          this.statsError = 'Try again to reconnect.';
          console.warn('Failed to load user stats:', err);
        })
        .finally(() => {
          this.statsLoading = false;
        });
    },
    activateRank() {
      const userId = userStore.userId;
      if (userId === undefined || userId === '') {
        return;
      }
      this.rankActivating = true;
      userService.activateRankInstance(userId)
        .then((userRank) => {
          this.userRank = userRank;
        })
        .catch((error: any) => {
          showError(error);
        })
        .finally(() => {
          this.rankActivating = false;
        });
    },
    getProfile() {
      if (!this.userId) {
        return;
      }
      userService.getUserProfile(this.userId)
        .then((data) => {
          if (data) {
            this.createtime = data.createtime || '';
          }
        })
        .catch((err: any) => {
          console.warn('Failed to load user profile:', err);
        });
    },
  },
});
</script>

<style scoped>
.me-page {
  box-sizing: border-box;
  display: flex;
  flex: 1;
  min-height: 0;
  width: 100%;
}

.me-page--vip {
  --me-accent: #fbbf24;
  --me-accent-soft: rgba(251, 191, 36, .14);
}

.me-container {
  align-items: start;
  display: grid;
  flex: 1;
  gap: clamp(20px, 3vw, 36px);
  grid-template-columns: minmax(220px, 248px) minmax(0, 1fr);
  margin: 0 auto;
  max-width: 1120px;
  min-width: 0;
  width: 100%;
}

.me-sidebar {
  align-self: start;
  background: color-mix(in srgb, var(--portal-surface, #121b2b) 92%, transparent);
  border: 1px solid var(--portal-border, rgba(164, 185, 213, .16));
  border-radius: var(--portal-radius, 18px);
  box-shadow: var(--portal-shadow, 0 16px 48px rgba(0, 0, 0, .2));
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 12px;
}

.me-user-card {
  background: var(--portal-elevated, #1a2639);
  border: 1px solid var(--portal-border, rgba(164, 185, 213, .16));
  border-radius: 14px;
  padding: 18px 14px;
}

.me-user-card--vip {
  border-color: rgba(251, 191, 36, .38);
}

.me-points-display {
  align-items: baseline;
  background: linear-gradient(135deg, rgba(226, 82, 14, .12), rgba(249, 115, 22, .08));
  border: 1px solid rgba(226, 82, 14, .3);
  border-radius: 8px;
  display: flex;
  gap: 6px;
  justify-content: center;
  margin-top: 16px;
  padding: 10px 16px;
  width: 100%;
}

.me-points-display--vip {
  background: linear-gradient(135deg, rgba(251, 191, 36, .15), rgba(245, 158, 11, .1));
  border-color: rgba(251, 191, 36, .4);
}

.me-points-display__value {
  color: #fb923c;
  font-family: monospace;
  font-size: 22px;
  font-weight: 800;
}

.me-points-display--vip .me-points-display__value {
  color: #fbbf24;
}

.me-points-display__label {
  color: var(--portal-muted, #a6b3c7);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .15em;
}

.me-sidebar__footer {
  border-top: 1px solid var(--portal-border, rgba(164, 185, 213, .16));
  padding-top: 14px;
}

.me-content {
  min-width: 0;
}

.me-section {
  animation: me-section-enter .3s ease both;
}

@keyframes me-section-enter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.me-section__count {
  align-items: center;
  background: var(--me-accent-soft, rgba(244, 129, 70, .14));
  border-radius: 999px;
  color: var(--me-accent, var(--portal-accent, #f48146));
  display: inline-flex;
  font-size: 12px;
  font-weight: 700;
  min-height: 28px;
  padding: 4px 10px;
}

/* Account panel */
.me-account-card__grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.me-account-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.me-account-item__label {
  color: var(--portal-muted, #a6b3c7);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .01em;
}

.me-account-item__value {
  align-items: center;
  color: var(--portal-text, #f1f5f9);
  display: flex;
  font-size: 15px;
  font-weight: 600;
  gap: 8px;
  min-width: 0;
}

.me-account-item__value--vip {
  color: #fbbf24;
}

/* Settings */
.me-setting-item {
  align-items: center;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 17px 24px;
  transition: background-color .2s ease;
}

.me-setting-item + .me-setting-item {
  border-top: 1px solid var(--portal-border, rgba(164, 185, 213, .16));
}

.me-setting-item:hover {
  background: rgba(166, 179, 199, .06);
}

.me-setting-item__info {
  min-width: 0;
}

.me-setting-item__label {
  color: var(--portal-text, #f1f5f9);
  font-size: 14px;
}

.me-toggle {
  flex: 0 0 auto;
  height: 24px;
  position: relative;
  width: 44px;
}

.me-toggle__input {
  height: 0;
  opacity: 0;
  width: 0;
}

.me-toggle__slider {
  background: rgba(164, 185, 213, .14);
  border: 1px solid var(--portal-border, rgba(164, 185, 213, .16));
  border-radius: 12px;
  cursor: pointer;
  inset: 0;
  position: absolute;
  transition: background-color .25s ease, border-color .25s ease;
}

.me-toggle__slider::before {
  background: var(--portal-muted, #a6b3c7);
  border-radius: 50%;
  content: '';
  height: 18px;
  left: 2px;
  position: absolute;
  top: 2px;
  transition: transform .25s ease, background-color .25s ease;
  width: 18px;
}

.me-toggle__input:checked + .me-toggle__slider {
  background: var(--me-accent-soft, rgba(244, 129, 70, .14));
  border-color: color-mix(in srgb, var(--me-accent, var(--portal-accent, #f48146)) 52%, transparent);
}

.me-toggle__input:checked + .me-toggle__slider::before {
  background: var(--me-accent, var(--portal-accent, #f48146));
  transform: translateX(20px);
}

.me-toggle__input:focus-visible + .me-toggle__slider {
  outline: 3px solid color-mix(in srgb, var(--me-accent, var(--portal-accent, #f48146)) 38%, transparent);
  outline-offset: 2px;
}

/* Games */
.me-games-list {
  display: flex;
  flex-direction: column;
}

.me-game-item {
  align-items: center;
  border-bottom: 1px solid var(--portal-border, rgba(164, 185, 213, .16));
  display: grid;
  gap: 16px;
  grid-template-columns: 140px minmax(0, 1fr) auto;
  padding: 14px 24px;
  transition: background-color .2s ease;
}

.me-game-item:last-child {
  border-bottom: none;
}

.me-game-item:hover {
  background: rgba(166, 179, 199, .05);
}

.me-game-item__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.me-game-item__date {
  color: var(--portal-muted, #a6b3c7);
  font-family: monospace;
  font-size: 12px;
}

.me-game-item__players {
  color: var(--portal-muted, #a6b3c7);
  font-size: 11px;
  font-weight: 600;
}

.me-game-item__members {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.me-game-item__player {
  border-radius: 3px;
  font-size: 12px;
  padding: 2px 8px;
}

.me-game-item__player a {
  color: var(--portal-text, #f1f5f9);
  cursor: pointer;
  text-decoration: none;
  transition: color .2s ease;
}

.me-game-item__player a:hover {
  color: #fff;
}

.me-game-item__status {
  display: flex;
  justify-content: flex-end;
}

.me-status {
  border-radius: 999px;
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .02em;
  padding: 4px 10px;
  text-decoration: none;
}

.me-status--muted {
  background: rgba(164, 185, 213, .1);
  border: 1px solid var(--portal-border, rgba(164, 185, 213, .16));
  color: var(--portal-muted, #a6b3c7);
}

.me-status--danger {
  background: rgba(239, 68, 68, .12);
  border: 1px solid rgba(239, 68, 68, .3);
  color: #ef4444;
}

.me-status--success {
  background: rgba(45, 212, 191, .12);
  border: 1px solid rgba(45, 212, 191, .3);
  color: #2dd4bf;
  cursor: pointer;
  transition: background-color .2s ease;
}

.me-status--success:hover {
  background: rgba(45, 212, 191, .2);
}

@media (max-width: 768px) {
  .me-container {
    align-items: stretch;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .me-sidebar {
    width: 100%;
  }

  .me-game-item {
    align-items: start;
    grid-template-columns: minmax(0, 1fr) auto;
    padding: 14px 18px;
  }

  .me-game-item__members {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .me-game-item__status {
    grid-column: 2;
    grid-row: 1;
  }
}

@media (max-width: 480px) {
  .me-sidebar {
    padding: 10px;
  }

  .me-user-card {
    padding: 16px 12px;
  }

  .me-setting-item {
    padding: 15px 18px;
  }

  .me-game-item {
    padding: 13px 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .me-section,
  .me-game-item,
  .me-status--success {
    animation: none;
    transition: none;
  }
}
</style>
