<template>
  <div class="player-timer" v-bind:class="timeState">
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
import {PreferencesManager} from '@/client/utils/PreferencesManager';

export default Vue.extend({
  name: 'PlayerTimer',
  props: {
    timer: {
      type: Object as () => TimerModel,
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
      timerText: '',
      timeState: '', // TODO 天梯 TEST
    };
  },
  // computed: {
  //   color: function() {
  //     return this.timeState === 'red' ? 'text-red-500' : this.timeState === 'red' ? 'text-orange-500' : '';
  //   },
  // },
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
  },
  methods: {
    updateTimer() {
      // 排名模式 启动倒计时
      console.log('this.rankTimeLimit', this.rankTimeLimit);
      console.log('timerText倒数', Timer.toString(this.timer, this.rankTimeLimit));
      console.log('timerText正数', Timer.toString(this.timer));
      console.log('timerMinute', Timer.getMinutes(this.timer, this.rankTimeLimit));
      if (this.rankMode) {
        this.timerText = Timer.toString(this.timer, this.rankTimeLimit);
        console.log('timerMinute', Timer.getMinutes(this.timer, this.rankTimeLimit));
        if (this.rankTimeLimit > 0 && Timer.getMinutes(this.timer, this.rankTimeLimit) <= 0) { // 超时，直接结束游戏
          this.endGameForTimeOut();
        } else if (Timer.getMinutes(this.timer, this.rankTimeLimit) <= 5) { // 剩余时间小于5分钟，显示红色时间
          this.timeState = 'text-red-500';
        } else if (Timer.getMinutes(this.timer, this.rankTimeLimit) <= 15) { // 剩余时间小于5分钟，显示红色时间
          this.timeState = 'text-orange-500';
        }
      } else {
        this.timerText = Timer.toString(this.timer);
      }
    },
    endGameForTimeOut: function():void {
      const userId = PreferencesManager.load('userId');
      // this.resignPanelOpen();
      // if (userId === '') {
      //   this.resignPanelOpen();
      //   return;
      // }
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'player/endgame');
      xhr.responseType = 'json';
      xhr.onload = () => {
        if (xhr.status === 200) {
          if (window.location.pathname === '/the-end') {
            (window as any).location = (window as any).location;
          }
        }
        // else if (xhr.status === 400 && xhr.responseType === 'json') {
        //   root.showAlert( xhr.response.message || '', () =>{});
        // } else {
        //   alert('Error sending input');
        // }
      };
      const senddata ={'playerId': this.playerId, 'userId': userId};
      xhr.send(JSON.stringify(senddata));
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
