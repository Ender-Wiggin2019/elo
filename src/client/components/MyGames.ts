import Vue from 'vue';

import axios from 'axios';
import {Phase} from '@/common/Phase';
import {getPreferences, PreferencesManager} from '../utils/PreferencesManager';
import ConfirmDialog from './common/ConfirmDialog.vue';
import RankTier from '@/client/components/RankTier.vue';
import {DEFAULT_MU, DEFAULT_RANK_VALUE, DEFAULT_SIGMA, UserRank} from '../../common/RankManager';

export const MyGames = Vue.component('my-games', {
  data: function() {
    return {
      userId: '',
      userName: '',
      games: [],
      vipDate: '',
      enable_sounds: false,
      showhandcards: false,
      // 天梯
      userRank: new UserRank('', DEFAULT_RANK_VALUE, DEFAULT_MU, DEFAULT_SIGMA),
      openTab: 1,
    };
  },
  components: {
    'confirm-dialog': ConfirmDialog,
    RankTier,
  },
  mounted: function() {
    this.userId = PreferencesManager.load('userId');
    this.userName = PreferencesManager.load('userName');
    if (this.userId.length > 0) {
      this.getGames();
      this.getUserRank();
    }
  },
  methods: {
    getGames: function() {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/mygames?id='+this.userId);
      xhr.onerror = function() {
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
          } else {
            alert('Unexpected response fetching games from API');
          }
        } else {
          alert('Unexpected response fetching games from API');
        }
      };
      xhr.responseType = 'json';
      xhr.send();
    },
    getUserRank: function() {
      if (this.userId === '') return;
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/userrank?userId='+this.userId);
      xhr.onerror = function() {
        alert('Error getting user rank data');
      };
      xhr.onload = () => {
        if (xhr.status === 200) {
          const result = xhr.response;
          if (result && result.rankValue >= 0) {
            this.userRank = new UserRank(this.userId, result.rankValue, result.mu, result.sigma); // 更新userRank的值
          }
        }
      };
      xhr.responseType = 'json';
      xhr.send();
    },
    getTier() {
      return this.userRank.getTier();
    },
    isGameRunning: function(gamePhase: string): boolean {
      return (gamePhase === Phase.END) ? false : true;
    },
    changeLogin: function(): void {
      if (this.userName !== '') {
        this.userId = '';
        this.userName = '';
        this.vipDate = '';
        this.games = [];
        PreferencesManager.loginOut();
      } else {
        window.location.href = '/login';
      }
    },
    updateTips: function() {
      PreferencesManager.INSTANCE.set('enable_sounds', this.enable_sounds );
    },
    updateShowHandCards: function() {
      if (this.showhandcards) {
        (this.$refs['showHand'] as any).show();
      } else {
        this.confimUpdate();
      }
    },
    cancelUpdate: function() {
      this.showhandcards = false;
    },
    confimUpdate: function() {
      const userId = PreferencesManager.load('userId');
      if ( userId === undefined || userId === '') {
        return;
      }
      axios.post('/api/showHand', {
        userId: userId,
        showhandcards: this.showhandcards,
      }).then(function(response) {
        console.log(response);
      }).catch(function(error) {
        alert(error);
      });
    },

    // 天梯，在`user_rank`表中创建对应数据
    activateRank: function() {
      const userId = PreferencesManager.load('userId');
      if ( userId === undefined || userId === '') {
        return;
      }
      console.log('activateRank');
      axios.post('/api/activateRank', {
        userId: userId,
        rankValue: DEFAULT_RANK_VALUE,
        mu: DEFAULT_MU,
        sigma: DEFAULT_SIGMA,
        activate: 1,
      }).then(function() {
        window.location.reload();
      }).catch(function(error) {
        alert(error);
      });
    },
    toggleTabs: function(tabNumber: number) {
      this.openTab = tabNumber;
    },
  },
  created() {
    if (window.localStorage) {
      this.enable_sounds = getPreferences().enable_sounds;
      this.userName = PreferencesManager.load('userName');
    }
  },
  template: `
    <div id="games-overview">
    <h1><a href="/" v-i18n>Terraforming Mars</a> — <span v-i18n>My Games</span>
    </h1>

    <div class="flex flex-wrap">
    <div class="w-full mr-8">
      <ul class="flex mb-0 list-none flex-wrap pt-3 pb-4 flex-row">
        <li class="-mb-px mr-2 last:mr-0 flex-auto text-center">
          <div class="text-xs font-bold uppercase px-5 py-3 shadow-lg rounded block leading-normal" v-on:click="toggleTabs(1)" v-bind:class="{'text-blue-300 bg-gray-700': openTab !== 1, 'text-white bg-blue-300': openTab === 1}">
            <span v-i18n>User Information</span>
          </div>
        </li>
        <li class="-mb-px mr-2 last:mr-0 flex-auto text-center">
          <div class="text-xs font-bold uppercase px-5 py-3 shadow-lg rounded block leading-normal" v-on:click="toggleTabs(2)" v-bind:class="{'text-blue-300 bg-gray-700': openTab !== 2, 'text-white bg-blue-300': openTab === 2}">
            <span v-i18n>User Setting</span>
          </div>
        </li>
        <li class="-mb-px mr-2 last:mr-0 flex-auto text-center">
          <div class="text-xs font-bold uppercase px-5 py-3 shadow-lg rounded block leading-normal" v-on:click="toggleTabs(3)" v-bind:class="{'text-blue-300 bg-gray-700': openTab !== 3, 'text-white bg-blue-300': openTab === 3}">
            <span v-i18n>User Games</span>
          </div>
        </li>
      </ul>
      <div class="relative flex flex-col min-w-0 break-words bg-gray-700 w-full mb-6 shadow-lg rounded">
        <div class="px-4 py-5 flex-auto">
          <div class="tab-content tab-space">
            <div v-bind:class="{'hidden': openTab !== 1, 'block': openTab === 1}">
              <button class="rounded-md bg-blue-500 hover:bg-blue-300 w-auto p-2 text-md align-center" 
                      v-on:click="changeLogin" v-i18n>
                <span v-if="userName">LoginOut</span>
                <span v-else>Login/Register</span>
              </button>
              
              <div v-if="userName" class="flex flex-col item-center">
                <div class="rounded-md bg-gray-500 w-64 my-4 text-center text-md" v-i18n>
                  <div class="text-gray-700 font-bold">{{$t('User Name')}}</div>
                  {{ userName }}
                </div>
                <div v-if="this.vipDate" class="align-center rounded-md bg-gray-500 w-64 my-4 text-center text-md" v-i18n>
                  <div class="text-gray-700 font-bold">{{$t('Potato Date')}}</div>
                  {{ vipDate }}
<!--                    <img src="assets/qrcode/potato.png" style="height: 50px;vertical-align: middle; margin-top: 2px"/>-->
                  </div>
                <div class="rounded-md bg-gray-500 w-64 h-24 my-4 text-center text-md" v-i18n>
                  <div class="text-gray-700 font-bold">User Rank</div>
                  <div v-if="this.userRank.userId!==''" class="scale-125 mt-2">
                    <RankTier :rankTier="getTier()"/>
                  </div>
                  <div v-else>
                    <button class="rounded-md bg-yellow-500 hover:bg-yellow-600 w-auto p-2 text-md align-center" v-on:click="activateRank" v-i18n>
                      Start Rank
                    </button>
                  </div>
                  <!--      <p>Hello <span class="user-name">{{ userName }}</span>,the following games are related with you:</p>-->
                </div>
                </div>
              </div>
            
            </div>
            <div v-bind:class="{'hidden': openTab !== 2, 'block': openTab === 2}">
              <div v-if="userName">
              <confirm-dialog message="开启后其他玩家可以通过你的游戏链接查看你的手牌，但不能帮你操作" ref="showHand"
                              v-on:accept="confimUpdate" v-on:dismiss="cancelUpdate"/>
              <label class="form-switch" style="margin-left: 20px;display: inline-block;">
                <input type="checkbox" name="enable_sounds" v-model="enable_sounds" v-on:change="updateTips">
                <i class="form-icon"></i> <span v-i18n>Soundtip</span>
              </label>
              <br />
              <label class="form-switch" style="margin-left: 20px;display: inline-block;">
                <input type="checkbox" name="showhandcards" v-model="showhandcards" v-on:change="updateShowHandCards">
                <i class="form-icon"></i> <span v-i18n>Show cards in hand to others</span>
              </label>
              </div>
            </div>
            <div v-bind:class="{'hidden': openTab !== 3, 'block': openTab === 3}">
              <div v-if="userName">
              <div class="relative overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead>
                <tr class="bg-gray-500">
                  <th v-i18n>Create Time</th>
                  <th v-i18n>Player Number</th>
                  <th v-i18n>Players</th>
                  <th v-i18n>Status</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="game in games">
                  <td><a v-bind:href="'/game?id='+game.id" target="_blank" v-i18n>{{ game.createtime.slice(0, 16) }}</a></td>
                  <td>{{ game.players.length }}</td>
                  <td class="text-left"><span v-for="player in game.players" class="player_name"
                            :class="'player_bg_color_'+ player.color">
                            <a :href="'/player?id=' + player.id">{{ player.name }}</a>
                        </span>
                  </td>
                  <td>
                    <div v-if="isGameRunning(game.phase)" class="rounded-md w-16 bg-green-600 text-center" v-i18n>Running</div>
                    <div v-else class="rounded-md w-16 bg-gray-500 text-center">Ended</div>
                  </td>
                </tr>
                
                </tbody>
              </table>
              </div>
<!--              <ul>-->
<!--                <li v-for="game in games">-->
<!--                  <a v-bind:href="'/game?id='+game.id" target="_blank">{{ game.id }}</a>-->
<!--                  <span>{{ game.createtime.slice(5, 16) }}  {{ game.updatetime.slice(5, 16) }}  </span>-->
<!--                  age: {{ game.gameAge }}-->
<!--                  with {{ game.players.length }} player(s) :-->
<!--                  <span class="player_home_block nofloat">-->
<!--                        <span v-for="player in game.players" class="player_name"-->
<!--                              :class="'player_bg_color_'+ player.color">-->
<!--                            <a :href="'/player?id=' + player.id">{{ player.name }}</a>-->
<!--                        </span>-->
<!--                        <span v-if="isGameRunning(game.phase)">is running</span><span v-else>has ended</span>-->
<!--                    </span>-->
<!--                </li>-->
<!--              </ul>-->
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

    <div class="container mx-auto rounded-md border-solid border-4   border-orange-500 bg-opacity-10">
    <div class="text-xl text-blue-300"> User Information </div>
      <div class="column-2 gap-3 my-3">
        <div>
        <div class="text-sm text-gray-400 underline decoration-blue-300" v-i18n>User Name</div>
          <div class="text-lg text-gray-100">{{ userName }}</div>
        </div>
      </div>
    </div>

<!--      <span v-if="this.vipDate"><img src="assets/qrcode/potato.png" style="height: 50px;vertical-align: middle;"/>-->
<!--        {{ vipDate }}<img src="assets/qrcode/potato.png" style="height: 50px;vertical-align: middle;"/></span>-->
<!--      <button class="btn btn-lg btn-success" style="margin-bottom: 7px;min-width: 80px;" v-on:click="changeLogin"-->
<!--              v-i18n><span v-if="userName">LoginOut</span><span v-else>Login/Register</span></button>-->
<!--    </h1>-->
<!--    <confirm-dialog message="开启后其他玩家可以通过你的游戏链接查看你的手牌，但不能帮你操作" ref="showHand"-->
<!--                    v-on:accept="confimUpdate" v-on:dismiss="cancelUpdate"/>-->
<!--    <label class="form-switch" style="margin-left: 20px;display: inline-block;">-->
<!--      <input type="checkbox" name="enable_sounds" v-model="enable_sounds" v-on:change="updateTips">-->
<!--      <i class="form-icon"></i> <span v-i18n>Soundtip</span>-->
<!--    </label>-->
<!--    <label class="form-switch" style="margin-left: 20px;display: inline-block;">-->
<!--      <input type="checkbox" name="showhandcards" v-model="showhandcards" v-on:change="updateShowHandCards">-->
<!--      <i class="form-icon"></i> <span v-i18n>Show cards in hand to others</span>-->
<!--    </label>-->
    <br>
    </div>`,
});

