<template>
  <div class="me-page min-h-screen bg-mars-void text-mars-text p-4 sm:p-6 lg:p-8"
    style="background-image: radial-gradient(ellipse at 50% -10%, rgba(226,82,14,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 90%, rgba(34,211,238,0.05) 0%, transparent 40%), linear-gradient(rgba(38,48,80,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(38,48,80,0.3) 1px, transparent 1px); background-size: 100% 100%, 100% 100%, 40px 40px, 40px 40px;">
    <div class="max-w-4xl mx-auto">

      <!-- Page Title -->
      <div class="flex items-center gap-3 mb-3">
        <span class="me-hud-dot"></span>
        <h1 class="text-lg font-bold text-mars-text uppercase tracking-widest" v-i18n>My Profile</h1>
      </div>
      <div class="me-divider mb-6"></div>

      <!-- Not logged in -->
      <div v-if="!userName" class="text-center py-20">
        <div class="text-5xl mb-4 opacity-40">&#9790;</div>
        <p class="text-mars-text-dim text-base mb-4 uppercase tracking-wide" v-i18n>Please sign in to view your profile</p>
        <a href="/login" class="me-btn-primary inline-block px-6 py-2.5 text-sm font-bold uppercase tracking-wider" v-i18n>Sign In</a>
      </div>

      <!-- Logged in content -->
      <template v-if="userName">

        <!-- ============ SECTION 1: Account Info ============ -->
        <div class="me-section mb-6">
          <div class="me-section__header">
            <span class="me-section__icon">&#9671;</span>
            <span class="me-section__title" v-i18n>Account</span>
          </div>

          <div class="me-panel">
            <div class="me-account-layout p-4 sm:p-6">
              <!-- Avatar -->
              <div class="me-account-avatar flex-shrink-0 w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-xl sm:text-3xl font-bold uppercase"
                :style="avatarStyle">
                {{ avatarLetter }}
              </div>
              <!-- Info -->
              <div class="me-account-info flex-1 min-w-0">
                <div class="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                  <h2 class="text-lg sm:text-2xl font-bold truncate text-mars-text">{{ userName }}</h2>
                  <span v-if="vipDate" class="inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-sm bg-mars-amber/20 text-mars-amber border border-mars-amber/30">VIP</span>
                </div>
                <!-- Rank display -->
                <div v-if="userRank.userId !== ''" class="flex items-center gap-2 sm:gap-3 mb-2">
                  <RankTier :rankTier="getTier()" :showNumber="false"/>
                  <span class="text-xs sm:text-sm font-mono text-mars-text-dim uppercase tracking-wider">{{ getTier().name }}</span>
                </div>
                <div v-else class="mb-2">
                  <button class="me-btn-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
                    @click="activateRank" v-i18n>Activate Rank</button>
                </div>
                <div v-if="vipDate" class="text-xs text-mars-text-faint font-mono">
                  <span v-i18n>Potato expires</span>: <span class="text-mars-amber">{{ vipDate }}</span>
                </div>
              </div>
              <!-- Actions -->
              <div class="me-account-actions">
                <button class="me-btn-secondary px-4 py-2 text-xs font-bold uppercase tracking-wider"
                  @click="changeLogin" v-i18n>Logout</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ============ SECTION 2: Game Stats ============ -->
        <div class="me-section mb-6">
          <div class="me-section__header">
            <span class="me-section__icon">&#9632;</span>
            <span class="me-section__title" v-i18n>Game Stats</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="me-stat-card p-4 text-center">
              <div class="text-xs font-mono text-mars-text-faint uppercase tracking-widest mb-1" v-i18n>Total Games</div>
              <div class="text-2xl font-bold font-mono text-mars-text">{{ games.length }}</div>
            </div>
            <div class="me-stat-card p-4 text-center">
              <div class="text-xs font-mono text-mars-text-faint uppercase tracking-widest mb-1" v-i18n>Rank</div>
              <div v-if="userRank.userId !== ''" class="pt-1">
                <RankTier :rankTier="getTier()" :showNumber="false"/>
              </div>
              <div v-else class="text-2xl font-bold font-mono text-mars-text-dim">—</div>
            </div>
            <div class="me-stat-card p-4 text-center">
              <div class="text-xs font-mono text-mars-text-faint uppercase tracking-widest mb-1" v-i18n>Rank Value</div>
              <div class="text-2xl font-bold font-mono text-mars-cyan">{{ userRank.userId ? Math.round(userRank.rankValue) : '—' }}</div>
            </div>
            <div class="me-stat-card p-4 text-center">
              <div class="text-xs font-mono text-mars-text-faint uppercase tracking-widest mb-1" v-i18n>VIP</div>
              <div v-if="vipDate" class="text-lg font-bold font-mono text-mars-amber">{{ vipDate }}</div>
              <div v-else>
                <a href="/donate" class="inline-block mt-1 px-3 py-1 bg-mars-amber/15 hover:bg-mars-amber/25 text-mars-amber text-xs font-bold uppercase tracking-wider border border-mars-amber/30 hover:border-mars-amber/50 transition-all" v-i18n>Get Potato</a>
              </div>
            </div>
          </div>
        </div>

        <!-- ============ SECTION 3: Settings ============ -->
        <div class="me-section mb-6">
          <div class="me-section__header">
            <span class="me-section__icon">&#9881;</span>
            <span class="me-section__title" v-i18n>Settings</span>
          </div>

          <div class="me-panel p-5">
            <confirm-dialog message="开启后其他玩家可以通过你的游戏链接查看你的手牌，但不能帮你操作" ref="showHand"
                            @accept="confimUpdate" @dismiss="cancelUpdate"/>
            <div class="space-y-4">
              <label class="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" name="enable_sounds" v-model="enable_sounds" @change="updateTips"
                  class="w-4 h-4 accent-mars-rust">
                <span class="text-sm text-mars-text-dim group-hover:text-mars-text transition-colors" v-i18n>Sound notifications</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" name="showhandcards" v-model="showhandcards" @change="updateShowHandCards"
                  class="w-4 h-4 accent-mars-rust">
                <span class="text-sm text-mars-text-dim group-hover:text-mars-text transition-colors" v-i18n>Show cards in hand to others</span>
              </label>
            </div>
          </div>
        </div>

        <!-- ============ SECTION 4: Current Games ============ -->
        <div class="me-section mb-6">
          <div class="me-section__header">
            <span class="me-section__icon">&#9654;</span>
            <span class="me-section__title" v-i18n>My Games</span>
            <span class="ml-auto text-xs font-mono text-mars-text-faint">{{ games.length }} <span v-i18n>total</span></span>
          </div>

          <div class="me-panel">
            <div v-if="games.length === 0" class="text-center py-12">
              <p class="text-mars-text-faint text-sm font-mono uppercase tracking-wider" v-i18n>No games yet</p>
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead>
                  <tr class="border-b border-mars-border">
                    <th class="py-3 px-4 text-xs uppercase tracking-wider text-mars-text-faint font-mono" v-i18n>Created</th>
                    <th class="py-3 px-4 text-xs uppercase tracking-wider text-mars-text-faint font-mono" v-i18n>Players</th>
                    <th class="py-3 px-4 text-xs uppercase tracking-wider text-mars-text-faint font-mono" v-i18n>Members</th>
                    <th class="py-3 px-4 text-xs uppercase tracking-wider text-mars-text-faint font-mono" v-i18n>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="game in games" :key="game.id" class="border-b border-mars-border/30 hover:bg-mars-surface/40 transition-colors">
                    <td class="py-2.5 px-4 font-mono text-mars-text-dim text-xs">{{ game.createtime.slice(0, 16) }}</td>
                    <td class="py-2.5 px-4 font-mono text-mars-text">{{ game.players.length }}</td>
                    <td class="py-2.5 px-4">
                      <span v-for="player in game.players" :key="player.id" class="player_name mr-1" :class="'player_bg_color_'+ player.color">
                        <a :href="'/player?id=' + player.id" class="text-mars-text hover:text-white transition-colors">{{ player.name }}</a>
                      </span>
                    </td>
                    <td class="py-2.5 px-4">
                      <span v-if="isGameAbandon(game.phase)" class="me-status-badge me-status-badge--muted">Abandon</span>
                      <span v-else-if="isGameTimeOut(game.phase)" class="me-status-badge me-status-badge--danger">Timeout</span>
                      <a v-else-if="isGameEnd(game.phase)" :href="'/game?id='+game.id" target="_blank" class="me-status-badge me-status-badge--muted hover:text-mars-text transition-colors" v-i18n>Ended</a>
                      <a v-else :href="'/game?id='+game.id" target="_blank" class="me-status-badge me-status-badge--success hover:bg-mars-teal/25 transition-colors" v-i18n>Running</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- View Rankings link -->
        <div class="text-center mt-4">
          <a href="/ranks" class="text-mars-cyan text-sm uppercase tracking-wider font-mono hover:underline" v-i18n>View Rankings &rarr;</a>
        </div>

      </template>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import axios from 'axios';
import {Phase} from '@/common/Phase';
import {getPreferences, PreferencesManager} from '@/client/utils/PreferencesManager';
import ConfirmDialog from '@/client/components/common/ConfirmDialog.vue';
import RankTier from '@/client/components/RankTier.vue';
import {UserRank} from '@/common/rank/RankManager';
import {DEFAULT_MU, DEFAULT_RANK_VALUE, DEFAULT_SIGMA} from '@/common/rank/constants';

export default Vue.extend({
  name: 'MePage',
  components: {
    'confirm-dialog': ConfirmDialog,
    RankTier,
  },
  data() {
    return {
      userId: '' as string,
      userName: '' as string,
      games: [] as Array<any>,
      vipDate: '' as string,
      enable_sounds: false,
      showhandcards: false,
      userRank: new UserRank('', DEFAULT_RANK_VALUE, DEFAULT_MU, DEFAULT_SIGMA, 0),
    };
  },
  computed: {
    avatarLetter(): string {
      return this.userName ? this.userName.charAt(0).toUpperCase() : '?';
    },
    avatarStyle(): Record<string, string> {
      const isVip = Boolean(this.vipDate);
      return {
        background: isVip
          ? 'linear-gradient(135deg, #facc15, #f59e0b)'
          : 'linear-gradient(135deg, #e2520e, #f97316)',
        color: '#fff',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
        boxShadow: isVip ? '0 0 20px rgba(245,158,11,0.35)' : '0 0 12px rgba(226,82,14,0.2)',
      };
    },
  },
  mounted() {
    this.userId = PreferencesManager.load('userId');
    this.userName = PreferencesManager.load('userName');
    if (window.localStorage) {
      this.enable_sounds = getPreferences().enable_sounds;
    }
    if (this.userId.length > 0) {
      this.getGames();
      this.getUserRank();
    }
  },
  methods: {
    getTier() {
      return this.userRank.getTier();
    },
    getGames() {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/mygames?id=' + this.userId);
      xhr.onerror = () => {
        alert('Error getting games data');
      };
      xhr.onload = () => {
        if (xhr.status === 200) {
          const result = xhr.response;
          if (result && result.mygames && result.mygames instanceof Array) {
            this.games = result.mygames;
            if (result.vipDate) {
              this.vipDate = result.vipDate;
            }
            this.showhandcards = result.showhandcards;
          }
        }
      };
      xhr.responseType = 'json';
      xhr.send();
    },
    getUserRank() {
      if (this.userId === '') return;
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/userrank?userId=' + this.userId);
      xhr.onerror = () => {};
      xhr.onload = () => {
        if (xhr.status === 200) {
          const result = xhr.response;
          if (result && result.rankValue >= 0) {
            this.userRank = new UserRank(this.userId, result.rankValue, result.mu, result.sigma, result.trueskill);
          }
        }
      };
      xhr.responseType = 'json';
      xhr.send();
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
      PreferencesManager.loginOut();
      window.location.href = '/';
    },
    updateTips() {
      PreferencesManager.INSTANCE.set('enable_sounds', this.enable_sounds);
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
      const userId = PreferencesManager.load('userId');
      if (userId === undefined || userId === '') return;
      axios.post('/api/showHand', {
        userId: userId,
        showhandcards: this.showhandcards,
      }).catch((error: any) => {
        alert(error);
      });
    },
    activateRank() {
      const userId = PreferencesManager.load('userId');
      if (userId === undefined || userId === '') return;
      axios.post('/api/activateRank', {
        userId: userId,
      }).then((response: any) => {
        if (response && response.data) {
          const result = response.data;
          this.userRank = new UserRank(this.userId, result.rankValue, result.mu, result.sigma, result.trueskill);
        }
      }).catch((error: any) => {
        alert(error);
      });
    },
  },
});
</script>

<style scoped>
/* === Shared page elements === */
.me-hud-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2dd4bf;
  box-shadow: 0 0 8px rgba(45,212,191,0.7);
  animation: meHudPulse 3s ease-in-out infinite;
}

@keyframes meHudPulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(45,212,191,0.7); }
  50% { opacity: 0.4; box-shadow: 0 0 3px rgba(45,212,191,0.3); }
}

.me-divider {
  height: 1px;
  background: linear-gradient(to right, rgba(226,82,14,0.7), rgba(226,82,14,0.3) 20%, rgba(38,48,80,0.5) 50%, transparent 100%);
}

/* === Section headers === */
.me-section__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.me-section__icon {
  color: #e2520e;
  font-size: 10px;
  opacity: 0.7;
}

.me-section__title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #94a3b8;
  font-family: monospace;
}

/* === Panels === */
.me-panel {
  background: linear-gradient(135deg, rgba(17,26,46,0.98) 0%, rgba(26,37,64,0.9) 100%);
  border: 1px solid #263050;
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
  box-shadow: 0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03);
  position: relative;
}

.me-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 24px;
  height: 2px;
  background: linear-gradient(to right, #e2520e, transparent);
}

.me-panel::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 24px;
  height: 2px;
  background: linear-gradient(to left, #e2520e80, transparent);
}

/* === Stat cards === */
.me-stat-card {
  background: linear-gradient(135deg, rgba(17,26,46,0.95) 0%, rgba(26,37,64,0.8) 100%);
  border: 1px solid rgba(38,48,80,0.5);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  transition: all 0.25s ease;
}

.me-stat-card:hover {
  border-color: rgba(226,82,14,0.35);
  transform: translateY(-2px);
}

/* === Buttons === */
.me-btn-primary {
  background: linear-gradient(135deg, #e2520e, #f97316);
  color: #fff;
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  box-shadow: 0 0 14px rgba(226,82,14,0.25);
  transition: all 0.2s ease;
  text-decoration: none;
}

.me-btn-primary:hover {
  box-shadow: 0 0 22px rgba(226,82,14,0.4);
  background: linear-gradient(135deg, #f97316, #f59e0b);
}

.me-btn-secondary {
  background: rgba(26,37,64,0.6);
  border: 1px solid rgba(38,48,80,0.7);
  color: #cbd5e1;
  border-radius: 2px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.me-btn-secondary:hover {
  border-color: rgba(226,82,14,0.4);
  color: #f1f5f9;
  background: rgba(226,82,14,0.1);
}

/* === Status badges === */
.me-status-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-family: monospace;
  text-transform: uppercase;
  border-radius: 2px;
  text-decoration: none;
}

.me-status-badge--muted {
  background: rgba(26,37,64,0.8);
  color: #94a3b8;
  border: 1px solid rgba(38,48,80,0.5);
}

.me-status-badge--danger {
  background: rgba(239,68,68,0.15);
  color: #ef4444;
  border: 1px solid rgba(239,68,68,0.3);
}

.me-status-badge--success {
  background: rgba(45,212,191,0.12);
  color: #2dd4bf;
  border: 1px solid rgba(45,212,191,0.3);
}

/* === Account layout === */
.me-account-layout {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.me-account-actions {
  flex-shrink: 0;
}

/* === Mobile responsive === */
@media (max-width: 640px) {
  .me-account-layout {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
  }

  .me-account-info {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .me-account-info .flex {
    justify-content: center;
  }

  .me-account-actions {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .me-section__header {
    flex-wrap: wrap;
  }

  /* Reduce stat card text */
  .me-stat-card {
    padding: 12px 8px !important;
  }

  /* Games table: make it scroll */
  .me-panel table {
    font-size: 12px;
  }

  .me-panel table th,
  .me-panel table td {
    padding: 8px 6px !important;
  }

  /* Page padding */
  .me-page {
    padding: 12px !important;
  }
}

@media (max-width: 480px) {
  .me-page {
    padding: 8px !important;
  }
}
</style>
