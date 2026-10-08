<template>
  <portal-panel padding="none">
    <article
      class="lobby-room-card"
      :class="statusClass"
      :data-room-id="room.roomId"
    >
      <header class="lobby-room-header">
        <div class="lobby-room-heading">
          <span class="lobby-room-status-dot" :class="statusDotClass" aria-hidden="true"></span>
          <div class="lobby-room-identity">
            <span class="lobby-room-owner">{{ room.ownerName }}</span>
            <span class="lobby-room-name" v-i18n>'s Room</span>
          </div>
          <span class="lobby-status-badge" :class="statusBadgeClass">{{ statusLabel }}</span>
          <span v-if="canJoin" class="lobby-availability" v-i18n>Joinable</span>
          <span v-if="isRanked" class="lobby-ranked">
            <tfm-icon name="trophy" :size="13" aria-hidden="true" />
            <span v-i18n>Ranked</span>
          </span>
        </div>

        <div class="lobby-room-meta">
          <span class="lobby-occupancy" :aria-label="$t('Players')">
            <strong>{{ room.players.length }}</strong>
            <span>/ {{ room.maxPlayers }}</span>
          </span>
          <tfm-button
            variant="ghost"
            size="icon"
            :aria-label="$t('View room settings')"
            :title="$t('View room settings')"
            @click="emitSettings"
          >
            <tfm-icon name="settings" :size="15" aria-hidden="true" />
          </tfm-button>
          <tfm-button
            v-if="room.isOwner && room.status === 'waiting'"
            variant="danger"
            size="icon"
            :loading="isPending('close')"
            :disabled="isRoomBusy && !isPending('close')"
            :aria-label="$t('Close room')"
            :title="$t('Close room')"
            @click="emitClose"
          >
            <tfm-icon name="close" :size="15" aria-hidden="true" />
          </tfm-button>
        </div>
      </header>

      <div v-if="settingsTags.length > 0" class="lobby-room-settings" aria-label="Room settings">
        <span v-for="tag in settingsTags" :key="tag" class="lobby-tag">{{ tag }}</span>
      </div>

      <div class="lobby-room-players">
        <div
          v-for="player in room.players"
          :key="player.name + '-' + player.color"
          class="lobby-player-slot"
        >
          <span
            class="lobby-player-color"
            :class="playerColorClass(player.color, 'bg_transparent')"
            aria-hidden="true"
          ></span>
          <a
            :href="'/user/' + encodeURIComponent(player.name)"
            class="lobby-player-name"
          >{{ player.name }}</a>
          <tfm-icon
            v-if="player.isOwner"
            name="star"
            :size="13"
            class="lobby-owner-icon"
            :title="$t('Owner')"
            :aria-label="$t('Owner')"
          />
          <span v-if="player.rankValue" class="lobby-player-rank">
            &#9733; {{ Math.round(player.rankValue) }}
          </span>
          <span
            v-if="room.status === 'confirming'"
            class="lobby-ready-state"
            :class="player.isReady ? 'lobby-ready-state--ready' : 'lobby-ready-state--waiting'"
          >
            {{ player.isReady ? $t('READY') : $t('STANDBY') }}
          </span>
          <tfm-button
            v-if="room.isOwner && !player.isOwner && room.status === 'waiting'"
            variant="danger"
            size="sm"
            :loading="isPending('kick', player.name)"
            :disabled="isRoomBusy && !isPending('kick', player.name)"
            @click="emitKick(player.name)"
          >
            <span v-i18n>Kick</span>
          </tfm-button>
        </div>

        <div
          v-for="i in emptySlotCount"
          :key="'empty-' + i"
          class="lobby-empty-slot"
        >
          <span v-i18n>[ Empty Slot ]</span>
        </div>
      </div>

      <footer class="lobby-room-actions">
        <template v-if="canJoin">
          <div class="lobby-join-controls">
            <fieldset class="lobby-color-picker" :disabled="isRoomBusy">
              <legend v-i18n>Color:</legend>
              <label
                v-for="color in availableColors"
                :key="color"
                class="lobby-color-choice"
                :for="'color-' + room.roomId + '-' + color"
              >
                <input
                  :id="'color-' + room.roomId + '-' + color"
                  type="radio"
                  :name="'joinColor-' + room.roomId"
                  :value="color"
                  :checked="selectedColor === color"
                  @change="emitSelectedColor(color)"
                >
                <span
                  class="lobby-color-swatch"
                  :class="playerColorClass(color, 'bg')"
                  aria-hidden="true"
                ></span>
                <span class="sr-only">{{ color }}</span>
              </label>
            </fieldset>
            <tfm-button
              variant="success"
              size="sm"
              :loading="isPending('join')"
              :disabled="selectedColor === undefined || (isRoomBusy && !isPending('join'))"
              @click="emitJoin"
            >
              <span v-i18n>Join</span>
            </tfm-button>
          </div>
        </template>

        <template v-else-if="room.isCurrentUserInRoom && !room.isOwner">
          <tfm-button
            variant="outline"
            size="sm"
            :loading="isPending('leave')"
            :disabled="isRoomBusy && !isPending('leave')"
            @click="emitLeave"
          >
            <span v-i18n>Leave</span>
          </tfm-button>
          <tfm-button
            v-if="room.status === 'confirming' && !room.currentUserReady"
            variant="success"
            size="sm"
            :loading="isPending('confirm')"
            :disabled="isRoomBusy && !isPending('confirm')"
            @click="emitConfirm"
          >
            <span v-i18n>Confirm</span>
          </tfm-button>
        </template>

        <template v-else-if="room.isOwner && room.status === 'waiting' && room.players.length >= 2">
          <tfm-button
            variant="primary"
            size="sm"
            :loading="isPending('start')"
            :disabled="isRoomBusy && !isPending('start')"
            @click="emitStart"
          >
            <span v-i18n>Start Game</span>
          </tfm-button>
        </template>

        <tfm-button
          v-if="room.status === 'started' && room.gameId"
          variant="cyan"
          size="sm"
          :href="'game?id=' + room.gameId"
        >
          <span v-i18n>Enter Game</span>
        </tfm-button>
      </footer>
    </article>
  </portal-panel>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';
import {Color} from '@/common/Color';
import {ILobbyRoomView} from '@/common/lobby/LobbyTypes';
import {playerColorClass} from '@/common/utils/utils';
import TfmButton from '@/client/components/common/TfmButton.vue';
import TfmIcon from '@/client/components/common/TfmIcon.vue';
import PortalPanel from '@/client/components/common/PortalPanel.vue';

export type LobbyRoomActionType = 'join' | 'leave' | 'confirm' | 'start' | 'kick' | 'close';
export interface LobbyRoomPendingAction {
  type: LobbyRoomActionType;
  playerName?: string;
}

export default defineComponent({
  name: 'LobbyRoomCard',
  components: {
    PortalPanel,
    TfmButton,
    TfmIcon,
  },
  emits: ['join', 'leave', 'confirm', 'start', 'kick', 'close', 'settings', 'update:selectedColor'],
  props: {
    room: {
      type: Object as PropType<ILobbyRoomView>,
      required: true,
    },
    statusLabel: {
      type: String,
      required: true,
    },
    settingsTags: {
      type: Array as PropType<Array<string>>,
      default: () => [],
    },
    availableColors: {
      type: Array as PropType<Array<Color>>,
      default: () => [],
    },
    selectedColor: {
      type: String as PropType<Color>,
      default: undefined,
    },
    canJoin: {
      type: Boolean,
      default: false,
    },
    pendingAction: {
      type: Object as PropType<LobbyRoomPendingAction>,
      default: undefined,
    },
    isRanked: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    emptySlotCount(): number {
      return Math.max(0, this.room.maxPlayers - this.room.players.length);
    },
    statusClass(): string {
      return `lobby-room-card--${this.room.status}`;
    },
    statusDotClass(): string {
      return `lobby-room-status-dot--${this.room.status}`;
    },
    statusBadgeClass(): string {
      return `lobby-status-badge--${this.room.status}`;
    },
    isRoomBusy(): boolean {
      return this.pendingAction !== undefined;
    },
  },
  methods: {
    playerColorClass,
    isPending(type: LobbyRoomActionType, playerName?: string): boolean {
      if (this.pendingAction === undefined || this.pendingAction.type !== type) {
        return false;
      }
      return type !== 'kick' || this.pendingAction.playerName === playerName;
    },
    emitSelectedColor(color: Color) {
      this.$emit('update:selectedColor', color);
    },
    emitJoin() {
      this.$emit('join', this.room.roomId);
    },
    emitLeave() {
      this.$emit('leave', this.room.roomId);
    },
    emitConfirm() {
      this.$emit('confirm', this.room.roomId);
    },
    emitStart() {
      this.$emit('start', this.room.roomId);
    },
    emitKick(targetUserName: string) {
      this.$emit('kick', this.room.roomId, targetUserName);
    },
    emitClose() {
      this.$emit('close', this.room.roomId);
    },
    emitSettings() {
      this.$emit('settings', this.room);
    },
  },
});
</script>

<style scoped>
.lobby-room-card {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
}

.lobby-room-header {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--portal-border, rgba(164, 185, 213, .16));
}

.lobby-room-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px 9px;
}

.lobby-room-status-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--portal-muted, #a6b3c7);
}

.lobby-room-status-dot--waiting {
  background: #2dd4bf;
}

.lobby-room-status-dot--confirming {
  background: #facc15;
}

.lobby-room-status-dot--started {
  background: #22d3ee;
}

.lobby-room-identity {
  display: inline-flex;
  min-width: 0;
  align-items: baseline;
  gap: 5px;
}

.lobby-room-owner {
  max-width: 15rem;
  overflow: hidden;
  color: var(--portal-text, #f1f5f9);
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lobby-room-name {
  color: var(--portal-muted, #a6b3c7);
  font-size: 13px;
  white-space: nowrap;
}

.lobby-status-badge,
.lobby-availability,
.lobby-ranked {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 2px 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .07em;
  line-height: 1.25;
  text-transform: uppercase;
  white-space: nowrap;
}

.lobby-status-badge--waiting {
  color: #71e2d0;
  background: rgba(45, 212, 191, .08);
}

.lobby-status-badge--confirming {
  color: #f7d75d;
  background: rgba(250, 204, 21, .08);
}

.lobby-status-badge--started {
  color: #79ddec;
  background: rgba(34, 211, 238, .08);
}

.lobby-status-badge--closed {
  color: var(--portal-muted, #a6b3c7);
  background: rgba(148, 163, 184, .07);
}

.lobby-availability {
  color: #71e2d0;
  border-color: rgba(45, 212, 191, .34);
  background: rgba(45, 212, 191, .05);
}

.lobby-ranked {
  gap: 4px;
  color: #e5bf72;
  border-color: rgba(245, 158, 11, .34);
  background: rgba(245, 158, 11, .05);
}

.lobby-room-meta {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;
  color: var(--portal-muted, #a6b3c7);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  white-space: nowrap;
}

.lobby-occupancy strong {
  color: var(--portal-accent, #e2520e);
  font-size: 15px;
}

.lobby-room-settings {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 18px 4px;
}

.lobby-tag {
  border: 1px solid rgba(164, 185, 213, .14);
  border-radius: 999px;
  padding: 3px 9px;
  color: #c8a078;
  background: rgba(26, 38, 58, .62);
  font-size: 11px;
  line-height: 1.3;
}

.lobby-room-players {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 18px 16px;
}

.lobby-player-slot,
.lobby-empty-slot {
  display: flex;
  min-width: 0;
  min-height: 38px;
  align-items: center;
  gap: 9px;
  border-radius: 9px;
  padding: 6px 10px;
}

.lobby-player-slot {
  border: 1px solid rgba(164, 185, 213, .1);
  background: rgba(10, 14, 26, .24);
}

.lobby-player-color {
  width: 4px;
  height: 21px;
  flex: 0 0 auto;
  border-radius: 999px;
}

.lobby-player-name {
  min-width: 0;
  overflow: hidden;
  color: var(--portal-text, #f1f5f9);
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lobby-player-name:hover {
  color: #22d3ee;
}

.lobby-owner-icon {
  color: #f3c96b;
}

.lobby-player-rank {
  color: var(--portal-muted, #a6b3c7);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
}

.lobby-ready-state {
  margin-left: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.lobby-ready-state--ready {
  color: #71e2d0;
}

.lobby-ready-state--waiting {
  color: #f7d75d;
}

.lobby-empty-slot {
  border: 1px dashed rgba(164, 185, 213, .18);
  color: var(--portal-muted, #a6b3c7);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.lobby-room-actions {
  margin-top: auto;
  border-top: 1px solid var(--portal-border, rgba(164, 185, 213, .16));
  padding: 13px 18px 15px;
}

.lobby-join-controls {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.lobby-color-picker {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  border: 0;
  padding: 0;
}

.lobby-color-picker legend {
  margin-right: 2px;
  color: var(--portal-muted, #a6b3c7);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.lobby-color-choice {
  display: inline-flex;
  position: relative;
  cursor: pointer;
}

.lobby-color-choice input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.lobby-color-swatch {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(164, 185, 213, .28);
  border-radius: 50%;
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}

.lobby-color-choice:hover .lobby-color-swatch {
  transform: translateY(-1px);
}

.lobby-color-choice input:checked + .lobby-color-swatch {
  border-color: var(--portal-text, #f1f5f9);
  box-shadow: 0 0 0 2px rgba(34, 211, 238, .42);
}

.lobby-color-choice input:focus-visible + .lobby-color-swatch {
  outline: 2px solid #f48146;
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .lobby-room-header {
    align-items: flex-start;
    padding: 14px 16px 12px;
  }

  .lobby-room-heading {
    gap: 6px 8px;
  }

  .lobby-room-owner {
    max-width: 10rem;
  }

  .lobby-room-meta {
    margin-left: auto;
  }

  .lobby-room-settings,
  .lobby-room-players,
  .lobby-room-actions {
    padding-right: 16px;
    padding-left: 16px;
  }

  .lobby-join-controls {
    align-items: stretch;
    flex-direction: column;
  }

  .lobby-color-picker {
    justify-content: center;
  }

  .lobby-join-controls .tfm-button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lobby-color-swatch {
    transition: none;
  }
}
</style>
