<template>
      <div class="player-status" v-on:click="changeDisplay">
        <div class="player-status-bottom">
          <div :class="getLabelAndTimerClasses()">
            <div :class="getActionStatusClasses()"><span v-i18n>{{ actionLabel }}</span></div>
            <div class="player-status-timer" v-if="showTimers && display==='timer'"><player-timer :timer="timer" :player-id="playerId" :rank-mode="rankMode" :rank-time-limit="rankTimeLimit"/></div>
            <RankTier :rankTier="rankTier" v-if="display==='tier'" class="ml-2"/>
          </div>
        </div>
      </div>
</template>

<script lang="ts">

import Vue from 'vue';
import {ActionLabel} from '@/client/components/overview/ActionLabel';
import PlayerTimer from '@/client/components/overview/PlayerTimer.vue';
import {TimerModel} from '@/common/models/TimerModel';
import RankTier from '@/client/components/RankTier.vue';

export default Vue.extend({
  name: 'player-status',
  props: {
    timer: {
      type: Object as () => TimerModel,
    },
    actionLabel: {
      type: String,
    },
    showTimers: {
      type: Boolean,
    },
    rankTier: {
      type: Object,
    },
    playerId: {
      type: String,
    },
    rankMode: { // 天梯 是否是排位模式
      type: Boolean,
    },
    rankTimeLimit: { // 天梯 限时 单位为分钟
      type: Number,
    },
  },
  data() {
    return {
      display: 'timer',
    };
  },
  components: {
    PlayerTimer,
    RankTier,
  },
  methods: {
    getLabelAndTimerClasses(): string {
      const classes: Array<string> = [];
      const baseClass = 'player-action-status-container';
      classes.push(baseClass);
      if (!this.showTimers) {
        classes.push('no-timer');
      }
      if (this.actionLabel === ActionLabel.PASSED || this.actionLabel === ActionLabel.RESIGNED) {
        classes.push(`${baseClass}--passed`);
      } else if (this.actionLabel === ActionLabel.ACTIVE || this.actionLabel === ActionLabel.DRAFTING || this.actionLabel === ActionLabel.RESEARCHING) {
        classes.push(`${baseClass}--active`);
      }
      return classes.join(' ');
    },
    getActionStatusClasses(): string {
      const classes: Array<string> = ['player-action-status'];
      if (this.actionLabel === ActionLabel.NONE) {
        classes.push('visibility-hidden');
      }
      return classes.join(' ');
    },
    changeDisplay(): void {
      if (this.display==='timer' && this.rankTier!==undefined) this.display = 'tier';
      else this.display = 'timer';
      console.log(this.rankTier);
    },
  },
});

</script>

