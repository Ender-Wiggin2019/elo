<template>
  <div id="game-lobby" class="portal-page lobby-page text-mars-text">
    <div class="lobby-content max-w-5xl mx-auto">
      <portal-page-header title="Game Lobby">
        <template #actions>
          <tfm-button
            variant="primary"
            :disabled="!isLoggedIn || isInAnyRoom"
            :title="!isLoggedIn ? $t('Please login first') : (isInAnyRoom ? $t('Leave your current room first') : '')"
            @click="showCreateForm = true"
          >
            <tfm-icon name="plus" :size="16" aria-hidden="true" />
            <span v-i18n>Create Room</span>
          </tfm-button>
          <tfm-button
            variant="outline"
            :loading="loading || refreshing"
            @click="fetchRooms()"
          >
            <tfm-icon name="refresh" :size="15" aria-hidden="true" />
            <span v-i18n>Refresh</span>
          </tfm-button>
          <span v-if="hasAnyRooms" class="lobby-room-count">
            <span class="lobby-hud-dot" aria-hidden="true"></span>
            <span class="text-xs text-mars-text-faint font-mono uppercase tracking-wider">
              {{ roomCount }} <span v-i18n>room(s)</span>
            </span>
          </span>
        </template>
      </portal-page-header>
    </div>

    <!-- 创建房间模式 -->
    <div v-if="showCreateForm" class="lobby-create-shell max-w-5xl mx-auto">
      <create-game-form
        :lobby-mode="true"
        @lobby-room-created="onRoomCreated"
        @lobby-cancel="showCreateForm = false"
      ></create-game-form>
    </div>

    <!-- 大厅主界面 -->
    <div v-else class="lobby-content max-w-5xl mx-auto">
      <div v-if="!isLoggedIn" class="lobby-login-wrap">
        <tfm-button variant="cyan" block @click="goToLogin">
          <span class="font-semibold" v-i18n>Login required.</span>
          <span class="ml-2 text-mars-text-dim" v-i18n>Click here to sign in before creating or joining a room.</span>
        </tfm-button>
      </div>

      <!-- 房间加载失败且没有可保留的房间时，给出可重试的正文状态。 -->
      <portal-panel v-if="roomsError && !loading && !hasAnyRooms" padding="none" role="alert">
        <portal-empty-state
          title="Unable to load rooms"
          description="Try again to reconnect."
        >
          <tfm-button variant="outline" :loading="loading" @click="fetchRooms()">
            <span v-i18n>Retry</span>
          </tfm-button>
        </portal-empty-state>
      </portal-panel>

      <!-- 房间刷新失败时保留已有列表，同时提示用户可以重试。 -->
      <portal-panel v-else-if="roomsError && !refreshing && hasAnyRooms" padding="compact" class="lobby-refresh-error" role="alert">
        <div class="lobby-refresh-error__content">
          <div>
            <p class="lobby-refresh-error__title" v-i18n>Rooms could not be refreshed.</p>
            <p class="lobby-refresh-error__description" v-i18n>Showing the last available room list.</p>
          </div>
          <tfm-button variant="outline" size="sm" :loading="refreshing" @click="fetchRooms()">
            <span v-i18n>Retry</span>
          </tfm-button>
        </div>
      </portal-panel>

      <!-- 空状态 -->
      <portal-panel v-else-if="hasLoadedOnce && !hasAnyRooms" padding="none">
        <portal-empty-state
          title="No active rooms"
          description="Create one to get started!"
        />
      </portal-panel>

      <!-- 加载中 -->
      <div v-if="loading && !hasLoadedOnce" class="lobby-loading-state text-center">
        <p class="text-mars-text-dim animate-pulse font-mono uppercase tracking-wider text-sm" v-i18n>Scanning rooms...</p>
      </div>

      <div v-if="hasAnyRooms" class="space-y-5">
        <div
          v-for="section in lobbySections"
          :key="section.key"
          class="lobby-section"
        >
          <tfm-button
            v-if="section.type === 'toggle'"
            variant="outline"
            size="sm"
            @click="showStartedRooms = !showStartedRooms"
          >
            <span class="text-mars-cyan font-mono" aria-hidden="true">{{ showStartedRooms ? '−' : '+' }}</span>
            <span>{{ showStartedRooms ? $t('Hide running rooms') : $t('Show running rooms') }}</span>
            <span class="text-mars-text-faint font-mono">({{ startedRooms.length }})</span>
          </tfm-button>

          <div v-else class="lobby-section-body">
            <div class="lobby-section-heading flex items-center gap-2">
              <span class="lobby-hud-dot" :class="{'lobby-hud-dot--active': section.key === 'section-my'}"></span>
              <span class="text-xs text-mars-text-dim uppercase tracking-wider font-mono">{{ section.title }}</span>
            </div>

            <!-- 房间列表 -->
            <div class="lobby-room-grid grid gap-5 sm:grid-cols-1 lg:grid-cols-2" :class="{'lg:grid-cols-1': section.singleRow}">
              <lobby-room-card
                v-for="room in section.rooms"
                :key="room.roomId"
                :room="room"
                :status-label="getStatusText(room.status)"
                :settings-tags="getSettingsTags(room)"
                :available-colors="getAvailableColors(room)"
                :selected-color="selectedColors[room.roomId]"
                :can-join="canJoinRoom(room)"
                :pending-action="pendingRoomActions[room.roomId]"
                :is-ranked="isRankedRoom(room)"
                @join="joinRoom"
                @leave="leaveRoom"
                @confirm="confirmReady"
                @start="startGame"
                @kick="kickPlayer"
                @close="closeRoom"
                @settings="openRoomSettings"
                @update:selectedColor="updateSelectedColor(room.roomId, $event)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <lobby-room-settings-modal ref="settingsModal" :room="activeSettingsRoom"></lobby-room-settings-modal>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import {Color, PLAYER_COLORS} from '@/common/Color';
import {ILobbyRoomView as ILobbyRoom, ELobbyRoomStatus} from '@/common/lobby/LobbyTypes';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {paths} from '@/common/app/paths';
import {translateText} from '@/client/directives/i18n';
import CreateGameForm from '@/client/components/create/CreateGameForm.vue';
import LobbyRoomCard, {LobbyRoomPendingAction} from '@/client/components/lobby/LobbyRoomCard.vue';
import LobbyRoomSettingsModal from '@/client/components/lobby/LobbyRoomSettingsModal.vue';
import PortalEmptyState from '@/client/components/common/PortalEmptyState.vue';
import PortalPageHeader from '@/client/components/common/PortalPageHeader.vue';
import PortalPanel from '@/client/components/common/PortalPanel.vue';
import TfmButton from '@/client/components/common/TfmButton.vue';
import TfmIcon from '@/client/components/common/TfmIcon.vue';
import {showError} from '@/client/utils/showAlert';
import {lobbyService} from '@/client/services';

const POLL_INTERVAL = 3000;

export default defineComponent({
  name: 'GameLobby',
  components: {
    CreateGameForm,
    LobbyRoomCard,
    LobbyRoomSettingsModal,
    PortalEmptyState,
    PortalPageHeader,
    PortalPanel,
    TfmButton,
    TfmIcon,
  },
  data() {
    return {
      rooms: [] as Array<ILobbyRoom>,
      previousRoomsById: {} as Record<string, ILobbyRoom>,
      loading: false,
      refreshing: false,
      roomsError: false,
      roomsRequestId: 0,
      roomsRequestsInFlight: 0,
      pendingRoomActions: {} as Record<string, LobbyRoomPendingAction | undefined>,
      hasLoadedOnce: false,
      showCreateForm: false,
      selectedColors: {} as Record<string, Color>,
      pollTimer: null as ReturnType<typeof setInterval> | null,
      showStartedRooms: false,
      activeSettingsRoom: null as ILobbyRoom | null,
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
      return this.rooms.some((room: ILobbyRoom) =>
        room.isCurrentUserInRoom &&
        room.status !== ELobbyRoomStatus.STARTED,
      );
    },
    isLoggedIn(): boolean {
      return this.userId !== undefined && this.userId !== '';
    },
    visibleLobbyRooms(): Array<ILobbyRoom> {
      return this.rooms
        .filter((room: ILobbyRoom) => this.isVisibleRoom(room))
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    myRooms(): Array<ILobbyRoom> {
      return this.visibleLobbyRooms.filter((room: ILobbyRoom) => this.isInRoom(room));
    },
    waitingRooms(): Array<ILobbyRoom> {
      return this.visibleLobbyRooms.filter((room: ILobbyRoom) => !this.isInRoom(room) && room.status !== ELobbyRoomStatus.STARTED);
    },
    startedRooms(): Array<ILobbyRoom> {
      return this.visibleLobbyRooms.filter((room: ILobbyRoom) => !this.isInRoom(room) && room.status === ELobbyRoomStatus.STARTED);
    },
    hasAnyRooms(): boolean {
      return this.visibleLobbyRooms.length > 0;
    },
    roomCount(): number {
      return this.visibleLobbyRooms.length;
    },
    lobbySections(): Array<{key: string; type: 'rooms' | 'toggle'; title?: string; rooms?: Array<ILobbyRoom>; singleRow?: boolean}> {
      const sections: Array<{key: string; type: 'rooms' | 'toggle'; title?: string; rooms?: Array<ILobbyRoom>; singleRow?: boolean}> = [];
      if (this.myRooms.length > 0) {
        sections.push({
          key: 'section-my',
          type: 'rooms',
          title: translateText('Your room'),
          rooms: this.myRooms,
          singleRow: true,
        });
      }
      if (this.waitingRooms.length > 0) {
        sections.push({
          key: 'section-waiting',
          type: 'rooms',
          title: translateText('Waiting to start'),
          rooms: this.waitingRooms,
          singleRow: false,
        });
      }
      if (this.startedRooms.length > 0) {
        sections.push({
          key: 'section-toggle',
          type: 'toggle',
        });
      }
      if (this.showStartedRooms && this.startedRooms.length > 0) {
        sections.push({
          key: 'section-started',
          type: 'rooms',
          title: translateText('In progress'),
          rooms: this.startedRooms,
          singleRow: false,
        });
      }
      return sections;
    },
  },
  mounted() {
    this.fetchRooms();
    this.startPolling();
  },
  beforeUnmount() {
    this.stopPolling();
    this.roomsRequestId++;
  },
  methods: {
    startPolling() {
      this.stopPolling();
      this.pollTimer = setInterval(() => {
        if (!this.showCreateForm && this.roomsRequestsInFlight === 0) {
          this.fetchRooms({silent: true});
        }
      }, POLL_INTERVAL);
    },
    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    },
    areRoomsEqual(a: ILobbyRoom, b: ILobbyRoom): boolean {
      return JSON.stringify(a) === JSON.stringify(b);
    },
    mergeRoomsPreservingIdentity(nextRooms: Array<ILobbyRoom>): Array<ILobbyRoom> {
      const currentRoomsById = Object.fromEntries(
        this.rooms.map((room: ILobbyRoom) => [room.roomId, room]),
      ) as Record<string, ILobbyRoom>;

      return nextRooms.map((room: ILobbyRoom) => {
        const currentRoom = currentRoomsById[room.roomId];
        if (currentRoom !== undefined && this.areRoomsEqual(currentRoom, room)) {
          return currentRoom;
        }
        return room;
      });
    },
    async fetchRooms(options: {silent?: boolean} = {}) {
      const silent = options.silent === true;
      if (!silent) {
        if (this.loading || this.refreshing) {
          return;
        }
        if (this.hasLoadedOnce) {
          this.refreshing = true;
        } else {
          this.loading = true;
        }
      }
      const requestId = ++this.roomsRequestId;
      this.roomsRequestsInFlight++;
      try {
        const previousRoomsById = this.previousRoomsById;
        const data = await lobbyService.getRooms(this.userId);
        if (requestId !== this.roomsRequestId) {
          return;
        }
        this.roomsError = false;
        const nextRooms = this.mergeRoomsPreservingIdentity(data.rooms || []);
        const roomsChanged = nextRooms.length !== this.rooms.length ||
          nextRooms.some((room, index) => room !== this.rooms[index]);
        if (roomsChanged) {
          this.rooms = nextRooms;
        }
        this.ensureDefaultJoinColors();
        this.maybeNavigateToStartedGame(previousRoomsById);
        this.previousRoomsById = Object.fromEntries(
          nextRooms.map((room: ILobbyRoom) => [room.roomId, room]),
        );
        this.hasLoadedOnce = true;
      } catch (err: any) {
        if (requestId !== this.roomsRequestId) {
          return;
        }
        this.roomsError = true;
        console.error('Failed to fetch rooms:', err);
      } finally {
        this.roomsRequestsInFlight--;
        if (!silent) {
          this.loading = false;
          this.refreshing = false;
        }
      }
    },
    async runRoomAction(roomId: string, pendingAction: LobbyRoomPendingAction, request: () => Promise<unknown>) {
      if (this.pendingRoomActions[roomId] !== undefined) {
        return;
      }
      this.pendingRoomActions = {
        ...this.pendingRoomActions,
        [roomId]: pendingAction,
      };
      try {
        await request();
        // Always read after a mutation, even when a manual refresh is in flight.
        await this.fetchRooms({silent: true});
      } catch (err: any) {
        showError(err.body || err.message);
      } finally {
        const activeAction = this.pendingRoomActions[roomId];
        if (activeAction?.type === pendingAction.type && activeAction.playerName === pendingAction.playerName) {
          const nextPendingRoomActions = {...this.pendingRoomActions};
          delete nextPendingRoomActions[roomId];
          this.pendingRoomActions = nextPendingRoomActions;
        }
      }
    },
    joinRoom(roomId: string) {
      const color = this.selectedColors[roomId];
      if (!this.userId) {
        showError(translateText('Please login first'));
        return;
      }
      return this.runRoomAction(roomId, {type: 'join'}, () => lobbyService.joinRoom(roomId, {
        userId: this.userId,
        userName: this.userName,
        color,
      }));
    },
    leaveRoom(roomId: string) {
      return this.runRoomAction(roomId, {type: 'leave'}, () => lobbyService.leaveRoom(roomId, this.userId));
    },
    kickPlayer(roomId: string, targetUserName: string) {
      return this.runRoomAction(roomId, {type: 'kick', playerName: targetUserName}, () => lobbyService.kickPlayer(roomId, this.userId, targetUserName));
    },
    startGame(roomId: string) {
      return this.runRoomAction(roomId, {type: 'start'}, () => lobbyService.startGame(roomId, this.userId));
    },
    async onRoomCreated(_room: ILobbyRoom) {
      this.showCreateForm = false;
      await this.fetchRooms();
    },
    isInRoom(room: ILobbyRoom): boolean {
      return room.isCurrentUserInRoom;
    },
    isVisibleRoom(room: ILobbyRoom): boolean {
      if (room.status === ELobbyRoomStatus.CLOSED) {
        return false;
      }
      if (room.status === ELobbyRoomStatus.STARTED) {
        const phase = (room.gameData as any)?.phase;
        if (phase === 'end' || phase === 'timeout' || phase === 'abandon') {
          return false;
        }
      }
      return true;
    },
    canJoinRoom(room: ILobbyRoom): boolean {
      return this.isLoggedIn && !this.isInAnyRoom && !this.isInRoom(room) && room.status === ELobbyRoomStatus.WAITING && room.players.length < room.maxPlayers;
    },
    isRankedRoom(room: ILobbyRoom): boolean {
      return Boolean((room.gameConfig as any)?.rankOption);
    },
    openRoomSettings(room: ILobbyRoom) {
      this.activeSettingsRoom = room;
      (this.$refs.settingsModal as any)?.show?.();
    },
    goToLogin() {
      window.location.href = '/' + paths.LOGIN;
    },
    updateSelectedColor(roomId: string, color: Color) {
      this.selectedColors = {
        ...this.selectedColors,
        [roomId]: color,
      };
    },
    ensureDefaultJoinColors() {
      const nextSelectedColors: Record<string, Color> = {};
      for (const room of this.rooms) {
        const availableColors = this.getAvailableColors(room);
        const selectedColor = this.selectedColors[room.roomId];
        if (selectedColor && availableColors.includes(selectedColor)) {
          nextSelectedColors[room.roomId] = selectedColor;
          continue;
        }
        if (availableColors.length > 0) {
          nextSelectedColors[room.roomId] = availableColors[0];
        }
      }
      this.selectedColors = nextSelectedColors;
    },
    getAvailableColors(room: ILobbyRoom): Array<Color> {
      const usedColors = new Set(room.players.map((p) => p.color));
      return PLAYER_COLORS.filter((c) => !usedColors.has(c));
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
    getSettingsTags(room: ILobbyRoom): Array<string> {
      const tags: Array<string> = [];
      const config = room.gameConfig;
      if (!config || !config.expansions) {
        return tags;
      }

      tags.push(room.maxPlayers + 'P');

      if (config.expansions.prelude) {
        tags.push('Prelude');
      }
      if (config.expansions.prelude2) {
        tags.push('Prelude 2');
      }
      if (config.expansions.venus) {
        tags.push('Venus');
      }
      if (config.expansions.colonies) {
        tags.push('Colonies');
      }
      if (config.expansions.turmoil) {
        tags.push('Turmoil');
      }
      if (config.expansions.promo) {
        tags.push('Promos');
      }
      if (config.expansions.ceo) {
        tags.push('CEOs');
      }
      if (config.expansions.moon) {
        tags.push('Moon');
      }
      if (config.expansions.pathfinders) {
        tags.push('Pathfinders');
      }
      if (config.expansions.ares) {
        tags.push('Ares');
      }
      if (config.expansions.community) {
        tags.push('Community');
      }
      if (config.expansions.starwars) {
        tags.push('Star Wars');
      }
      if (config.expansions.underworld) {
        tags.push('Underworld');
      }
      if (config.expansions.breakthrough) {
        tags.push('Breakthrough');
      }
      if (config.expansions.eros) {
        tags.push('Eros');
      }

      if (config.draftVariant) {
        tags.push('Draft');
      }

      return tags;
    },
    closeRoom(roomId: string) {
      return this.runRoomAction(roomId, {type: 'close'}, () => lobbyService.leaveRoom(roomId, this.userId));
    },
    confirmReady(roomId: string) {
      return this.runRoomAction(roomId, {type: 'confirm'}, () => lobbyService.confirmReady(roomId, this.userId));
    },
    maybeNavigateToStartedGame(previousRoomsById: Record<string, ILobbyRoom>) {
      const myStartedRoom = this.rooms.find((room: ILobbyRoom) =>
        previousRoomsById[room.roomId] !== undefined &&
        previousRoomsById[room.roomId].status !== ELobbyRoomStatus.STARTED &&
        room.status === ELobbyRoomStatus.STARTED &&
        this.isInRoom(room) &&
        room.gameData !== undefined,
      );
      if (myStartedRoom?.gameData) {
        this.navigateToGame(myStartedRoom.gameData);
      }
    },
    navigateToGame(gameData: any) {
      this.stopPolling();
      if (gameData.players.length === 1) {
        window.location.href = 'player?id=' + gameData.players[0].id;
      } else {
        window.location.href = 'game?id=' + gameData.id;
      }
    },
  },
});
</script>

<style scoped>
/* Lobby surfaces stay quiet so the shared portal shell can carry the atmosphere. */
.lobby-page {
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  background: transparent;
}

.lobby-content,
.lobby-create-shell {
  width: 100%;
  min-width: 0;
}

.lobby-hud-dot {
  display: inline-block;
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--portal-muted, #a6b3c7);
}

.lobby-hud-dot--active {
  background: #2dd4bf;
}

.lobby-room-count {
  color: var(--portal-muted, #a6b3c7);
  white-space: nowrap;
}

.lobby-room-count .lobby-hud-dot {
  width: 5px;
  height: 5px;
}

.lobby-login-wrap { margin-bottom: 20px; }

.lobby-loading-state {
  padding: clamp(48px, 8vw, 80px) 24px;
}

.lobby-refresh-error__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.lobby-refresh-error__title,
.lobby-refresh-error__description {
  margin: 0;
}

.lobby-refresh-error__title {
  color: var(--portal-text, #e2e8f0);
  font-size: 14px;
  font-weight: 600;
}

.lobby-refresh-error__description {
  margin-top: 4px;
  color: var(--portal-muted, #a6b3c7);
  font-size: 12px;
}

.lobby-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lobby-section + .lobby-section {
  margin-top: 30px;
}

.lobby-section-heading {
  min-height: 20px;
}

.lobby-section-heading .lobby-hud-dot {
  width: 5px;
  height: 5px;
}

.lobby-room-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  align-items: start;
}

@media (max-width: 900px) {
  .lobby-room-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .lobby-room-count {
    margin-left: auto;
    align-self: center;
  }

  .lobby-refresh-error__content {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
