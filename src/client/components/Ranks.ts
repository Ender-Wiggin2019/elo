import Vue from 'vue';

import axios from 'axios';
import {PreferencesManager} from '../utils/PreferencesManager';
import ConfirmDialog from './common/ConfirmDialog.vue';
import RankTier from '@/client/components/RankTier.vue';
import {DEFAULT_MU, DEFAULT_RANK_VALUE, DEFAULT_SIGMA, RankTiers} from '../../common/RankManager';

const RANK_LIMIT = 100;
export const Ranks = Vue.component('ranks', {
  data: function() {
    return {
      allUserRanks: [],
      // 天梯
      openTab: 1,
      rankTiers: RankTiers,
    };
  },
  components: {
    'confirm-dialog': ConfirmDialog,
    RankTier,
  },
  mounted: function() {
    this.getRanks();
  },
  methods: {
    getRanks: function() {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/userranks?limit=' + RANK_LIMIT);
      xhr.onerror = function() {
        alert('Error getting games data');
      };
      xhr.onload = () => {
        if (xhr.status === 200) {
          const result = xhr.response;
          if (result && result.allUserRanks && result.allUserRanks instanceof Array) {
            this.allUserRanks = result.allUserRanks;
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
            <span v-i18n>Rank Rules</span>
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

              <div>
                <div class="relative overflow-x-auto">
                  <table class="w-full text-lg text-left">
                    <thead>
                    <tr class="bg-gray-500">
                      <th v-i18n>Rank No</th>
                      <th v-i18n>User Name</th>
                      <th v-i18n>Rank Tier</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="(singleUserRank, index) in allUserRanks">
                      <td>{{ index + 1}}</td>
                      <td>{{singleUserRank.userName}}</td>
                      <td><div class="hover:scale-125"><RankTier :rankTier="singleUserRank.userTier"/></div></td>
                    </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
            </div>
            <div v-bind:class="{'hidden': openTab !== 2, 'block': openTab === 2}">

            </div>
            <div v-bind:class="{'hidden': openTab !== 3, 'block': openTab === 3}">
              
              <div>
              <div class="relative overflow-x-auto">
              <table class="w-full text-lg text-left">
                <thead>
                <tr class="bg-gray-500">
                  <th v-i18n>Tier Name</th>
                  <th v-i18n>Tier Icon</th>
                  <th v-i18n>Description</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="rankTier in rankTiers">
                  <td>{{rankTier.name}}</td>
                  <td><div class="hover:scale-125"><RankTier :rankTier="rankTier"/></div></td>
                  <td>
                    <div v-if="rankTier.measurement==='value'">最高段位，玩家会显示根据<a href="https://www.microsoft.com/en-us/research/project/trueskill-ranking-system/">TrueSkill</a>计算的分数</div>
                    <div v-else-if="rankTier.maxStars===3">在这个段位玩家不会降星</div>
                  </td>
                </tr>
                </tbody>
              </table>
              </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
    </div>
`,
});

