<template>
  <div id="game-lobby" class="lobby-page min-h-screen bg-mars-void text-mars-text p-4 sm:p-6 lg:p-8">
    <!-- Header with HUD-style accents -->
    <div class="max-w-5xl mx-auto mb-8">
      <div class="flex items-center gap-3">
        <a href="/" class="text-mars-rust hover:text-mars-ember transition-colors text-sm font-semibold uppercase tracking-widest" v-i18n>Terraforming Mars</a>
        <span class="text-mars-text-faint text-xs">&#9656;</span>
        <span class="text-sm font-bold text-mars-text uppercase tracking-widest" v-i18n>Game Lobby</span>
        <span class="lobby-hud-dot ml-2"></span>
      </div>
      <!-- HUD divider line -->
      <div class="lobby-hud-line mt-3"></div>
    </div>

    <!-- 创建房间模式 -->
    <div v-if="showCreateForm" class="max-w-5xl mx-auto">
      <create-game-form
        :lobby-mode="true"
        @lobby-room-created="onRoomCreated"
        @lobby-cancel="showCreateForm = false"
      ></create-game-form>
    </div>

    <!-- 大厅主界面 -->
    <div v-else class="max-w-5xl mx-auto">
      <!-- 顶部操作栏 -->
      <div class="flex items-center gap-3 mb-6 flex-wrap">
        <button
          class="lobby-btn-create inline-flex items-center gap-2 px-5 py-2.5 bg-mars-rust hover:bg-mars-ember disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-mars-rust text-white font-medium transition-all"
          @click="showCreateForm = true"
          :disabled="isInAnyRoom"
          :title="isInAnyRoom ? $t('Leave your current room first') : ''"
        >
          <span class="text-lg leading-none font-bold">+</span>
          <span v-i18n>Create Room</span>
        </button>
        <button
          class="inline-flex items-center gap-1.5 px-4 py-2.5 bg-mars-surface hover:bg-mars-border text-mars-text-dim hover:text-mars-text font-medium transition-colors border border-mars-border rounded"
          @click="fetchRooms"
        >
          <span v-i18n>Refresh</span>
        </button>
        <div class="ml-auto flex items-center gap-2" v-if="rooms.length > 0">
          <span class="lobby-hud-dot"></span>
          <span class="text-xs text-mars-text-faint font-mono uppercase tracking-wider">
            {{ rooms.length }} <span v-i18n>room(s)</span>
          </span>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="rooms.length === 0 && !loading" class="text-center py-24">
        <div class="lobby-empty-icon text-5xl mb-6">&#9790;</div>
        <p class="text-mars-text-dim text-base mb-1 uppercase tracking-wide" v-i18n>No active rooms</p>
        <p class="text-mars-text-faint text-sm" v-i18n>Create one to get started!</p>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="text-center py-20">
        <p class="text-mars-text-dim animate-pulse font-mono uppercase tracking-wider text-sm" v-i18n>Scanning rooms...</p>
      </div>

      <!-- 房间列表 -->
      <div class="grid gap-5 sm:grid-cols-1 lg:grid-cols-2">
        <div
          v-for="room in rooms"
          :key="room.roomId"
          class="lobby-room-card relative overflow-hidden transition-all"
          :class="{
            'lobby-room-card--active': isInRoom(room) && room.status !== 'confirming',
            'lobby-room-card--confirming': room.status === 'confirming',
          }"
        >
          <!-- HUD corner accents -->
          <div class="lobby-corner lobby-corner--tl"></div>
          <div class="lobby-corner lobby-corner--tr"></div>
          <div class="lobby-corner lobby-corner--bl"></div>
          <div class="lobby-corner lobby-corner--br"></div>

          <!-- 房间头部 -->
          <div class="flex items-center justify-between px-5 py-3 border-b border-mars-border/60">
            <div class="flex items-center gap-2 min-w-0">
              <span class="lobby-hud-dot" :class="{'lobby-hud-dot--active': room.status === 'waiting'}"></span>
              <span class="font-semibold text-mars-text truncate">{{ room.ownerName }}</span>
              <span class="text-mars-text-faint text-sm flex-shrink-0" v-i18n>'s Room</span>
              <span
                class="lobby-status-badge inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-wider flex-shrink-0"
                :class="statusBadgeClass(room.status)"
              >
                {{ getStatusText(room.status) }}
              </span>
            </div>
            <div class="flex-shrink-0 ml-3 text-sm font-mono">
              <span class="text-mars-rust font-bold text-base">{{ room.players.length }}</span>
              <span class="text-mars-text-faint"> / {{ room.maxPlayers }}</span>
            </div>
          </div>

          <!-- 游戏设置摘要 -->
          <div class="px-5 py-2.5 flex flex-wrap gap-1.5" v-if="getSettingsTags(room).length > 0">
            <span
              class="lobby-tag inline-block px-2.5 py-0.5 text-xs font-medium"
              v-for="tag in getSettingsTags(room)"
              :key="tag"
            >{{ tag }}</span>
          </div>

          <!-- 玩家列表 -->
          <div class="px-5 py-2 space-y-1.5">
            <div
              v-for="player in room.players"
              :key="player.userId"
              class="lobby-player-slot flex items-center gap-2 px-3 py-2 text-sm"
              :class="getPlayerColorClass(player.color)"
            >
              <a :href="'/user/' + encodeURIComponent(player.name)" class="font-medium truncate text-mars-text hover:text-mars-cyan transition-colors">{{ player.name }}</a>
              <span
                v-if="player.isOwner"
                class="px-1.5 py-0.5 bg-mars-amber/20 text-mars-amber text-xs font-bold uppercase tracking-wide border border-mars-amber/30 rounded-sm"
                v-i18n
              >CMD</span>
              <span v-if="player.rankValue" class="text-xs text-mars-text-dim font-mono">
                &#9733; {{ Math.round(player.rankValue) }}
              </span>
              <span
                v-if="room.status === 'confirming'"
                class="ml-auto text-xs font-bold uppercase tracking-wider font-mono"
                :class="player.isReady ? 'text-mars-teal' : 'text-mars-yellow animate-pulse'"
              >
                {{ player.isReady ? $t('READY') : $t('STANDBY') }}
              </span>
              <button
                v-if="isOwner(room) && !player.isOwner && room.status === 'waiting'"
                class="ml-auto px-2.5 py-0.5 text-xs font-medium bg-mars-red/15 hover:bg-mars-red/30 text-mars-red rounded-sm transition-colors border border-mars-red/20"
                @click="kickPlayer(room.roomId, player.userId)"
                v-i18n
              >Kick</button>
            </div>
            <!-- 空位 slot -->
            <div
              v-for="i in (room.maxPlayers - room.players.length)"
              :key="'empty-' + i"
              class="lobby-empty-slot flex items-center px-3 py-2 text-sm text-mars-text-faint"
            >
              <span class="font-mono text-xs uppercase tracking-wider" v-i18n>[ Empty Slot ]</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="px-5 py-3 border-t border-mars-border/60 flex items-center gap-2 flex-wrap">
            <!-- 未加入 -->
            <template v-if="!isInRoom(room) && room.status === 'waiting' && room.players.length < room.maxPlayers">
              <div class="flex items-center gap-3 flex-wrap w-full">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-mars-text-faint uppercase tracking-wider font-mono" v-i18n>Color:</span>
                  <template v-for="color in getAvailableColors(room)">
                    <label :for="'color-' + room.roomId + '-' + color" :key="color" class="cursor-pointer">
                      <input
                        type="radio"
                        :id="'color-' + room.roomId + '-' + color"
                        :name="'joinColor-' + room.roomId"
                        :value="color"
                        v-model="selectedColors[room.roomId]"
                        class="sr-only peer"
                      >
                      <div
                        class="w-7 h-7 rounded-full border-2 border-mars-border peer-checked:border-mars-text peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-offset-mars-deep peer-checked:ring-mars-cyan transition-all"
                        :class="'create-game-colorbox ' + getPlayerCubeColorClass(color)"
                      ></div>
                    </label>
                  </template>
                </div>
                <button
                  class="lobby-btn-action ml-auto px-4 py-1.5 disabled:opacity-30 disabled:cursor-not-allowed text-mars-teal text-sm font-medium transition-all border border-mars-teal/40 hover:border-mars-teal/70 hover:bg-mars-teal/10"
                  @click="joinRoom(room.roomId)"
                  :disabled="!selectedColors[room.roomId]"
                  v-i18n
                >Join</button>
              </div>
            </template>

            <!-- 已加入且非房主 -->
            <template v-if="isInRoom(room) && !isOwner(room)">
              <button
                class="lobby-btn-action px-4 py-1.5 text-mars-text-dim hover:text-mars-text text-sm font-medium transition-all border border-mars-border hover:border-mars-text-dim"
                @click="leaveRoom(room.roomId)"
                v-i18n
              >Leave</button>
              <button
                v-if="room.status === 'confirming' && !isReady(room)"
                class="lobby-btn-action px-4 py-1.5 text-mars-teal text-sm font-medium transition-all border border-mars-teal/40 hover:border-mars-teal/70 hover:bg-mars-teal/10"
                @click="confirmReady(room.roomId)"
                v-i18n
              >Confirm</button>
            </template>

            <!-- 房主操作 -->
            <template v-if="isOwner(room)">
              <button
                v-if="room.status === 'waiting' && room.players.length >= 2"
                class="lobby-btn-create px-4 py-1.5 bg-mars-rust hover:bg-mars-ember text-white text-sm font-medium transition-all"
                @click="startGame(room.roomId)"
                v-i18n
              >Launch Game</button>
              <button
                v-if="room.status === 'waiting'"
                class="lobby-btn-action px-4 py-1.5 text-mars-red text-sm font-medium transition-all border border-mars-red/30 hover:border-mars-red/60 hover:bg-mars-red/10"
                @click="closeRoom(room.roomId)"
                v-i18n
              >Close</button>
            </template>

            <!-- 游戏已开始 -->
            <template v-if="room.status === 'started' && room.gameId">
              <a
                :href="'game?id=' + room.gameId"
                class="lobby-btn-action inline-block px-4 py-1.5 text-mars-cyan text-sm font-medium transition-all border border-mars-cyan/40 hover:border-mars-cyan/70 hover:bg-mars-cyan/10"
                v-i18n
              >Enter Game</a>
            </template>
          </div>
        </div>
      </div>
    </div>

    <preferences-icon></preferences-icon>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import {Color, PLAYER_COLORS} from '@/common/Color';
import {ILobbyRoom, ELobbyRoomStatus} from '@/common/lobby/LobbyTypes';
import {request} from '@/client/utils/request';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {playerColorClass} from '@/common/utils/utils';
import {paths} from '@/common/app/paths';
import * as constants from '@/common/constants';
import {translateText} from '@/client/directives/i18n';
import CreateGameForm from '@/client/components/create/CreateGameForm.vue';
import PreferencesIcon from '@/client/components/PreferencesIcon.vue';
import {vueRoot} from '@/client/components/vueRoot';

const POLL_INTERVAL = 3000;

export default Vue.extend({
  name: 'GameLobby',
  components: {
    CreateGameForm,
    PreferencesIcon,
  },
  data() {
    return {
      rooms: [] as Array<ILobbyRoom>,
      loading: false,
      showCreateForm: false,
      selectedColors: {} as Record<string, Color>,
      pollTimer: null as ReturnType<typeof setInterval> | null,
    };
  },
  computed: {
    userId(): string {
      return PreferencesManager.load('userId');
    },
    userName(): string {
      return PreferencesManager.load('userName');
    },
    isInAnyRoom(): boolean {
      return this.rooms.some((room: ILobbyRoom) => room.players.some((p) => p.userId === this.userId));
    },
  },
  mounted() {
    this.fetchRooms();
    this.startPolling();
  },
  beforeDestroy() {
    this.stopPolling();
  },
  methods: {
    startPolling() {
      this.stopPolling();
      this.pollTimer = setInterval(() => {
        if (!this.showCreateForm) {
          this.fetchRooms();
        }
      }, POLL_INTERVAL);
    },
    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    },
    async fetchRooms() {
      try {
        const data = await request.get<{rooms: Array<ILobbyRoom>}>('/api/v2/lobby/list');
        this.rooms = data.rooms;

        // 初始化颜色选择
        for (const room of this.rooms) {
          if (!this.selectedColors[room.roomId]) {
            const available = this.getAvailableColors(room);
            if (available.length > 0) {
              this.$set(this.selectedColors, room.roomId, available[0]);
            }
          }
        }

        // 检查我所在房间的状态
        for (const room of this.rooms) {
          if (!this.isInRoom(room)) continue;

          // 房主：确认阶段且所有人已确认 -> 创建游戏
          if (room.status === 'confirming' && this.isOwner(room)) {
            const allReady = room.players.every((p) => p.isReady);
            if (allReady) {
              await this.pollAndCreateGame(room.roomId);
              break;
            }
          }

          // 非房主：游戏已启动 -> 自动跳转
          if (room.status === 'started' && room.gameData && !this.isOwner(room)) {
            this.navigateToGame(room.gameData);
            break;
          }
        }
      } catch (err) {
        console.error('Failed to fetch rooms:', err);
      }
    },
    async pollAndCreateGame(roomId: string) {
      try {
        const data = await request.get<{room: ILobbyRoom; allReady: boolean; gameConfig?: any}>(
          `/api/v2/lobby/${roomId}/poll`,
        );
        if (data.allReady && data.gameConfig) {
          await this.createGameFromLobby(roomId, data.gameConfig);
        }
      } catch (err) {
        console.error('Failed to poll and create game:', err);
      }
    },
    async onRoomCreated(_room: ILobbyRoom) {
      this.showCreateForm = false;
      await this.fetchRooms();
    },
    isInRoom(room: ILobbyRoom): boolean {
      return room.players.some((p) => p.userId === this.userId);
    },
    isOwner(room: ILobbyRoom): boolean {
      return room.ownerId === this.userId;
    },
    isReady(room: ILobbyRoom): boolean {
      const player = room.players.find((p) => p.userId === this.userId);
      return player?.isReady ?? false;
    },
    getAvailableColors(room: ILobbyRoom): Array<Color> {
      const usedColors = new Set(room.players.map((p) => p.color));
      return PLAYER_COLORS.filter((c) => !usedColors.has(c));
    },
    getPlayerColorClass(color: Color): string {
      return playerColorClass(color, 'bg_transparent');
    },
    getPlayerCubeColorClass(color: Color): string {
      return playerColorClass(color, 'bg');
    },
    getStatusText(status: string): string {
      switch (status) {
      case ELobbyRoomStatus.WAITING: return translateText('Waiting');
      case ELobbyRoomStatus.CONFIRMING: return translateText('Confirming');
      case ELobbyRoomStatus.STARTED: return translateText('Started');
      case ELobbyRoomStatus.CLOSED: return translateText('Closed');
      default: return status;
      }
    },
    statusBadgeClass(status: string): string {
      switch (status) {
      case ELobbyRoomStatus.WAITING: return 'bg-mars-teal/15 text-mars-teal';
      case ELobbyRoomStatus.CONFIRMING: return 'bg-mars-yellow/15 text-mars-yellow';
      case ELobbyRoomStatus.STARTED: return 'bg-mars-cyan/15 text-mars-cyan';
      case ELobbyRoomStatus.CLOSED: return 'bg-mars-surface text-mars-text-faint';
      default: return 'bg-mars-surface text-mars-text-faint';
      }
    },
    getSettingsTags(room: ILobbyRoom): Array<string> {
      const tags: Array<string> = [];
      const config = room.gameConfig;
      if (!config || !config.expansions) return tags;

      tags.push(room.maxPlayers + 'P');

      if (config.expansions.prelude) tags.push('Prelude');
      if (config.expansions.prelude2) tags.push('Prelude 2');
      if (config.expansions.venus) tags.push('Venus');
      if (config.expansions.colonies) tags.push('Colonies');
      if (config.expansions.turmoil) tags.push('Turmoil');
      if (config.expansions.promo) tags.push('Promos');
      if (config.expansions.ceo) tags.push('CEOs');
      if (config.expansions.moon) tags.push('Moon');
      if (config.expansions.pathfinders) tags.push('Pathfinders');
      if (config.expansions.ares) tags.push('Ares');
      if (config.expansions.community) tags.push('Community');
      if (config.expansions.starwars) tags.push('Star Wars');
      if (config.expansions.underworld) tags.push('Underworld');
      if (config.expansions.breakthrough) tags.push('Breakthrough');
      if (config.expansions.eros) tags.push('Eros');

      if (config.draftVariant) tags.push('Draft');
      if ((config as any).rankOption) tags.push('Ranked');

      return tags;
    },
    async joinRoom(roomId: string) {
      const color = this.selectedColors[roomId];
      if (!color) {
        alert(translateText('Please select a color'));
        return;
      }
      if (!this.userId) {
        alert(translateText('Please login first'));
        return;
      }
      try {
        await request.post(`/api/v2/lobby/${roomId}/join`, {
          userId: this.userId,
          userName: this.userName,
          color,
        });
        await this.fetchRooms();
      } catch (err: any) {
        alert(err.body || err.message);
      }
    },
    async leaveRoom(roomId: string) {
      try {
        await request.post(`/api/v2/lobby/${roomId}/leave`, {
          userId: this.userId,
        });
        await this.fetchRooms();
      } catch (err: any) {
        alert(err.body || err.message);
      }
    },
    async kickPlayer(roomId: string, targetUserId: string) {
      try {
        await request.post(`/api/v2/lobby/${roomId}/kick`, {
          userId: this.userId,
          targetUserId,
        });
        await this.fetchRooms();
      } catch (err: any) {
        alert(err.body || err.message);
      }
    },
    async startGame(roomId: string) {
      try {
        await request.post(`/api/v2/lobby/${roomId}/start`, {
          userId: this.userId,
        });
        await this.fetchRooms();
      } catch (err: any) {
        alert(err.body || err.message);
      }
    },
    async confirmReady(roomId: string) {
      try {
        const data = await request.post<{room: ILobbyRoom; allReady: boolean; gameConfig?: any}>(
          `/api/v2/lobby/${roomId}/confirm`,
          {userId: this.userId},
        );

        if (data.allReady && data.gameConfig) {
          // 所有人已确认，创建游戏
          await this.createGameFromLobby(roomId, data.gameConfig);
        } else {
          await this.fetchRooms();
        }
      } catch (err: any) {
        alert(err.body || err.message);
      }
    },
    async closeRoom(roomId: string) {
      try {
        await request.post(`/api/v2/lobby/${roomId}/leave`, {
          userId: this.userId,
        });
        await this.fetchRooms();
      } catch (err: any) {
        alert(err.body || err.message);
      }
    },
    async createGameFromLobby(roomId: string, gameConfig: any) {
      try {
        const response = await fetch(paths.API_CREATEGAME, {
          method: 'POST',
          body: JSON.stringify(gameConfig),
          headers: {'Content-Type': 'application/json'},
        });
        const text = await response.text();
        const json = JSON.parse(text);

        // 标记房间已启动，将游戏数据保存到房间中供其他玩家查看
        await request.post(`/api/v2/lobby/${roomId}/markStarted`, {
          gameId: json.id,
          gameData: json,
        });

        // 跳转到游戏页面
        this.navigateToGame(json);
      } catch (err: any) {
        alert('Failed to create game: ' + (err.message || err));
      }
    },
    navigateToGame(gameData: any) {
      this.stopPolling();
      if (gameData.players.length === 1) {
        window.location.href = 'player?id=' + gameData.players[0].id;
      } else {
        window.history.replaceState(gameData, `${constants.APP_NAME} - Game`, 'game?id=' + gameData.id);
        vueRoot(this).game = gameData;
        vueRoot(this).screen = 'game-home';
      }
    },
  },
});
</script>

<style scoped>
/* === Page background with subtle grid + warm glow === */
.lobby-page {
  background-image:
    radial-gradient(ellipse at 50% -5%, rgba(194,65,12,0.10) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(6,182,212,0.04) 0%, transparent 40%),
    linear-gradient(rgba(30,42,66,0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(30,42,66,0.3) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 40px 40px, 40px 40px;
}

/* === HUD pulsing dot === */
.lobby-hud-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #64748b;
  box-shadow: 0 0 4px rgba(100,116,139,0.5);
}
.lobby-hud-dot--active {
  background: #14b8a6;
  box-shadow: 0 0 6px rgba(20,184,166,0.6);
  animation: hudPulse 2s ease-in-out infinite;
}

@keyframes hudPulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(20,184,166,0.6); }
  50% { opacity: 0.5; box-shadow: 0 0 2px rgba(20,184,166,0.3); }
}

/* === HUD divider line === */
.lobby-hud-line {
  height: 1px;
  background: linear-gradient(
    to right,
    rgba(194,65,12,0.6),
    rgba(194,65,12,0.3) 20%,
    rgba(46,63,94,0.5) 50%,
    transparent 100%
  );
}

/* === Room card with angular clip + glow border === */
.lobby-room-card {
  background: #182136;
  border: 1px solid #2e3f5e;
  border-radius: 4px;
  clip-path: polygon(
    0 0, calc(100% - 12px) 0, 100% 12px,
    100% 100%, 12px 100%, 0 calc(100% - 12px)
  );
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
}
.lobby-room-card--active {
  border-color: rgba(194,65,12,0.5);
  box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 20px rgba(194,65,12,0.08);
}
.lobby-room-card--confirming {
  border-color: rgba(234,179,8,0.5);
  box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 20px rgba(234,179,8,0.08);
}

/* === HUD corner accents === */
.lobby-corner {
  position: absolute;
  width: 16px;
  height: 16px;
  pointer-events: none;
}
.lobby-corner--tl { top: 0; left: 0; border-top: 2px solid rgba(194,65,12,0.5); border-left: 2px solid rgba(194,65,12,0.5); }
.lobby-corner--tr { top: 0; right: 0; border-top: 2px solid rgba(194,65,12,0.3); border-right: 2px solid rgba(194,65,12,0.3); }
.lobby-corner--bl { bottom: 0; left: 0; border-bottom: 2px solid rgba(194,65,12,0.3); border-left: 2px solid rgba(194,65,12,0.3); }
.lobby-corner--br { bottom: 0; right: 0; border-bottom: 2px solid rgba(194,65,12,0.5); border-right: 2px solid rgba(194,65,12,0.5); }

.lobby-room-card--active .lobby-corner--tl,
.lobby-room-card--active .lobby-corner--br {
  border-color: rgba(194,65,12,0.7);
}
.lobby-room-card--confirming .lobby-corner--tl,
.lobby-room-card--confirming .lobby-corner--br {
  border-color: rgba(234,179,8,0.7);
}

/* === Status badge with border === */
.lobby-status-badge {
  border-radius: 2px;
  border: 1px solid currentColor;
  opacity: 0.85;
}

/* === Setting tags === */
.lobby-tag {
  background: rgba(31,43,68,0.8);
  color: #a3764f;
  border: 1px solid rgba(46,63,94,0.6);
  border-radius: 2px;
}

/* === Player slot === */
.lobby-player-slot {
  border-radius: 4px;
  border-left: 3px solid transparent;
}

/* === Empty slot with dashed sci-fi border === */
.lobby-empty-slot {
  border: 1px dashed rgba(46,63,94,0.8);
  border-radius: 4px;
}

/* === Buttons with angular clip === */
.lobby-btn-create {
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  border-radius: 0;
  box-shadow: 0 0 12px rgba(194,65,12,0.2);
}
.lobby-btn-create:hover {
  box-shadow: 0 0 18px rgba(194,65,12,0.35);
}
.lobby-btn-action {
  border-radius: 2px;
  background: transparent;
}

/* === Empty state icon glow === */
.lobby-empty-icon {
  color: #64748b;
  text-shadow: 0 0 20px rgba(194,65,12,0.2);
  opacity: 0.4;
}
</style>
