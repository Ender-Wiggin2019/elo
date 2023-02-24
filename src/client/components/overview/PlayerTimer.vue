<template>
  <div class="player-timer">
    <template v-if="hasHours()">
        <div class="player-timer-hours time-part">{{ getHours() }}</div>
        <div class="timer-delimiter">:</div>
    </template>
    <div class="player-timer-minutes time-part">{{ getMinutes() }}</div>
    <div class="timer-delimiter">:</div>
    <div class="player-timer-seconds time-part">{{ getSeconds() }}</div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import {Timer} from '@/common/Timer';
import {TimerModel} from '@/common/models/TimerModel';

export default Vue.extend({
  name: 'PlayerTimer',
  props: {
    timer: {
      type: Object as () => TimerModel,
    },
  },
  data() {
    return {
      timerText: '',
      restSeconds: 15, // TODO 天梯 TEST
    };
  },
  mounted() {
    this.updateTimer();
  },
  watch: {
    timerText: {
      handler() {
        setTimeout(() => {
          this.updateTimer();
        }, 1000);
      },
    },
    // restSeconds: { // TODO 天梯 TEST
    //   handler(newValue) {
    //     if (newValue===0) console.log('Time===0!');
    //     else if (newValue===10) alert('Time===10!');
    //   },
    // },
  },
  methods: {
    updateTimer() {
      this.timerText = Timer.toString(this.timer);
      if (this.getSeconds()==='20') console.log('Time===20!'); // TODO 天梯 TEST
      // else if (this.getSeconds()==='30') alert('Time===30!');
    },
    hasHours() {
      if (this.timerText.split(':').length > 2) {
        return 1;
      }
      return 0;
    },
    getHours(): string {
      if (this.hasHours()) {
        return this.timerText.split(':')[0];
      }
      return '';
    },
    getMinutes(): string {
      if (this.hasHours()) {
        return this.timerText.split(':')[1];
      }
      return this.timerText.split(':')[0];
    },
    getSeconds(): string {
      if (this.hasHours()) {
        return this.timerText.split(':')[2];
      }
      return this.timerText.split(':')[1];
    },
  },
});
</script>
