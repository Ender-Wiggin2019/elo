<template>
  <dialog ref="dialog" class="lobby-settings-modal">
    <div class="lobby-settings-shell">
      <div class="lobby-settings-header">
        <div class="lobby-settings-title">
          <span class="font-semibold">{{ room?.ownerName }}</span>
          <span class="text-mars-text-faint" v-i18n>'s Room Settings</span>
        </div>
        <tfm-button
          variant="ghost"
          size="icon"
          :aria-label="$t('Close')"
          :title="$t('Close')"
          @click="close"
        >
          <tfm-icon name="close" :size="16" aria-hidden="true" />
        </tfm-button>
      </div>
      <div class="lobby-settings-body">
        <game-setup-detail
          v-if="room !== null"
          :game-options="newGameConfigToGameOptionsModel(room.gameConfig)"
          :player-number="room.maxPlayers"
          :last-solo-generation="14"
        />
      </div>
    </div>
  </dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import {showModal, windowHasHTMLDialogElement} from '@/client/components/HTMLDialogElementCompatibility';
import dialogPolyfill from 'dialog-polyfill';
import {ILobbyRoomView} from '@/common/lobby/LobbyTypes';
import GameSetupDetail from '@/client/components/GameSetupDetail.vue';
import {newGameConfigToGameOptionsModel as mapNewGameConfigToOptions, NewGameConfig} from '@/common/game/NewGameConfig';
import TfmButton from '@/client/components/common/TfmButton.vue';
import TfmIcon from '@/client/components/common/TfmIcon.vue';

export default defineComponent({
  name: 'LobbyRoomSettingsModal',
  components: {
    GameSetupDetail,
    TfmButton,
    TfmIcon,
  },
  props: {
    room: {
      type: Object as () => ILobbyRoomView | null,
      default: null,
    },
  },
  methods: {
    // Expose the imported mapper to the template while keeping the conversion
    // implementation centralized in NewGameConfig.
    newGameConfigToGameOptionsModel(config: ILobbyRoomView['gameConfig']) {
      // Lobby responses intentionally omit the userId before reaching the
      // client; the mapper only reads the public game settings fields.
      return mapNewGameConfigToOptions(config as Omit<NewGameConfig, 'players'>);
    },
    getDialog(): HTMLDialogElement | undefined {
      return this.$refs.dialog as HTMLDialogElement | undefined;
    },
    show() {
      const dialog = this.getDialog();
      if (dialog !== undefined) {
        showModal(dialog);
      }
    },
    close() {
      this.getDialog()?.close?.();
    },
  },
  mounted() {
    if (!windowHasHTMLDialogElement()) {
      const dialog = this.getDialog();
      if (dialog !== undefined) {
        dialogPolyfill.registerDialog(dialog);
      }
    }
  },
});
</script>

<style scoped>
.lobby-settings-modal {
  width: min(920px, 94vw);
  max-width: calc(100vw - 24px);
  max-height: min(88dvh, 760px);
  border: 1px solid var(--portal-border, rgba(164, 185, 213, .16));
  border-radius: var(--portal-radius, 18px);
  background: var(--portal-surface, #121b2b);
  color: var(--portal-text, #f1f5f9);
  padding: 0;
  box-shadow: var(--portal-shadow, 0 18px 60px rgba(0, 0, 0, .55));
}

.lobby-settings-modal::backdrop {
  background: rgba(3, 8, 18, .72);
}

.lobby-settings-shell {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-height: min(88dvh, 760px);
}

.lobby-settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--portal-border, rgba(164, 185, 213, .16));
  background: var(--portal-elevated, #1a2639);
}

.lobby-settings-title {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.lobby-settings-body {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 14px 16px 16px;
  overflow-wrap: anywhere;
}

/* ============ Desktop: ensure center alignment ============ */
.lobby-settings-modal[open] {
  margin: auto;
}

/* ============ Mobile ============ */
@media (max-width: 640px) {
  .lobby-settings-modal {
    width: calc(100vw - 24px);
    max-height: calc(100dvh - 32px);
    border-radius: 14px;
  }

  .lobby-settings-modal[open] {
    margin: auto;
  }

  .lobby-settings-header {
    align-items: flex-start;
    padding: 10px 12px;
  }

  .lobby-settings-title {
    font-size: 11px;
    gap: 4px;
  }

  .lobby-settings-body {
    padding: 10px 12px 14px;
  }
}
</style>
