<template>
  <div id="load-game" class="portal-page">
    <div class="load-game-content portal-enter">
      <h1 class="portal-heading" v-i18n>Load Game</h1>
      <form class="load-game-form portal-panel" @submit.prevent="loadGame">
        <div class="load-game-field">
          <label for="gameId">Game or player ID to reload:</label>
          <input id="gameId" class="load-game-id" placeholder="Game Id" v-model="gameId" />
        </div>
        <div class="load-game-field">
          <label for="rollbackCount">Number of saves to delete before loading:</label>
          <input id="rollbackCount" class="load-game-id" type="number" min="0" v-model.number="rollbackCount" />
        </div>
        <TfmButton variant="primary" size="lg" type="submit"><span v-i18n>Load Game</span></TfmButton>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import * as constants from '@/common/constants';
import TfmButton from '@/client/components/common/TfmButton.vue';
import {LoadGameFormModel} from '@/common/models/LoadGameFormModel';
import {SimpleGameModel} from '@/common/models/SimpleGameModel';
import {vueRoot} from '@/client/components/vueRoot';
import {GameId} from '@/common/Types';
import {paths} from '@/common/app/paths';
import {showError, showWarning} from '../utils/showAlert';

type LoadGameFormDataModel = {
  gameId: GameId | undefined;
  rollbackCount: number;
};

export default defineComponent({
  name: 'LoadGameForm',
  components: {
    TfmButton,
  },
  data(): LoadGameFormDataModel {
    return {
      gameId: undefined,
      rollbackCount: 0,
    };
  },
  methods: {
    loadGame() {
      const gameId = this.gameId;
      const rollbackCount = this.rollbackCount;
      if (gameId === undefined) {
        showWarning('Specify a game id');
        return;
      }
      const loadGameForm: LoadGameFormModel = {
        gameId,
        rollbackCount,
      };

      fetch(paths.LOAD_GAME, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(loadGameForm),
      })
        .then((resp) => {
          if (!resp.ok) {
            throw new Error(`Error getting game data: ${resp.statusText}`);
          }
          return resp.json();
        })
        .then((response: SimpleGameModel) => {
          if (response.players.length === 1) {
            window.location.href = 'player?id=' + response.players[0].id;
            return;
          } else {
            window.history.replaceState(response, `${constants.APP_NAME} - Game`, 'game?id=' + response.id);
            vueRoot(this).game = response;
            vueRoot(this).screen = 'game-home';
          }
        })
        .catch((err) => {
          showError('Error loading game');
          console.error(err);
        });
    },
  },
  computed: {
    APP_NAME(): string {
      return constants.APP_NAME;
    },
  },
});
</script>
