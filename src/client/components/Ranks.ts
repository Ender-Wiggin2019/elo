import Vue from 'vue';

// import {PreferencesManager} from '../utils/PreferencesManager';
import ConfirmDialog from './common/ConfirmDialog.vue';
import RankTier from '@/client/components/RankTier.vue';
import {RankTiers} from '../../common/rank/RankTiers';

const RANK_LIMIT = 100;
export const Ranks = Vue.component('ranks', {
  data: function() {
    return {
      allUserRanks: [],
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
          console.log('No Ranking Data yet.');
        }
      };
      xhr.responseType = 'json';
      xhr.send();
    },
    toggleTabs: function(tabNumber: number) {
      this.openTab = tabNumber;
    },
    getTierColor: function(rankTier: any): string {
      const colors: Record<string, string> = {
        'Iron': '#78716c',
        'Bronze': '#b4783c',
        'Silver': '#94a3b8',
        'Gold': '#eab308',
        'Platinum': '#06b6d4',
        'Diamond': '#60a5fa',
        'Master': '#a78bfa',
        'Grandmaster': '#f87171',
        'Challenger': '#fbbf24',
      };
      return colors[rankTier.name] || '#94a3b8';
    },
    getTierCardStyle: function(rankTier: any, _idx: number): Record<string, string> {
      const color = (this as any).getTierColor(rankTier);
      return {
        background: `linear-gradient(135deg, rgba(24,33,54,0.95) 0%, rgba(31,43,68,0.8) 100%)`,
        borderColor: `${color}30`,
        borderLeftWidth: '3px',
        borderLeftColor: `${color}80`,
      };
    },
    getTierGlowStyle: function(rankTier: any): Record<string, string> {
      const color = (this as any).getTierColor(rankTier);
      return {
        background: `radial-gradient(ellipse at 0% 50%, ${color}15 0%, transparent 70%)`,
      };
    },
  },
  created() {
  },
  template: `
    <div class="ranks-page min-h-screen bg-mars-void text-mars-text p-4 sm:p-6 lg:p-8"
      style="background-image: radial-gradient(ellipse at 50% 0%, rgba(194,65,12,0.10) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(6,182,212,0.04) 0%, transparent 40%), linear-gradient(rgba(30,42,66,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(30,42,66,0.25) 1px, transparent 1px); background-size: 100% 100%, 100% 100%, 40px 40px, 40px 40px;">
      <div class="max-w-5xl mx-auto">

        <!-- Header -->
        <div class="flex items-center gap-2 mb-1">
          <a href="/" class="text-mars-rust hover:text-mars-ember transition-colors text-sm font-semibold uppercase tracking-widest" v-i18n>Terraforming Mars</a>
          <span class="text-mars-text-faint text-xs">&#9656;</span>
          <span class="text-sm font-bold text-mars-text uppercase tracking-widest" v-i18n>Ranking</span>
        </div>
        <div class="mb-6" style="height:1px;background:linear-gradient(to right,rgba(194,65,12,0.7),rgba(194,65,12,0.3) 25%,rgba(46,63,94,0.5) 55%,transparent 100%);"></div>

        <!-- Tabs -->
        <div class="flex gap-1 mb-5" style="cursor:pointer;">
          <div v-for="(tab, idx) in [{id:1, label:'Leaderboard'}, {id:2, label:'Rank Rules'}, {id:3, label:'Rank Tiers'}]"
               class="ranks-tab flex-1 text-center text-xs font-bold uppercase tracking-widest px-4 py-3 transition-all relative"
               v-on:click="toggleTabs(tab.id)"
               :key="tab.id"
               v-bind:class="{
                 'ranks-tab--active bg-mars-deep text-mars-text': openTab === tab.id,
                 'text-mars-text-dim hover:text-mars-text hover:bg-mars-deep/50': openTab !== tab.id
               }">
            <span v-i18n>{{ tab.label }}</span>
            <div v-if="openTab === tab.id" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8" style="height:2px;background:linear-gradient(to right,transparent,#c2410c,transparent);"></div>
          </div>
        </div>

        <!-- =============== TAB 1: Leaderboard =============== -->
        <div v-if="openTab === 1">
          <!-- Top 3 Podium -->
          <div v-if="allUserRanks.length >= 3" class="flex items-end justify-center gap-3 mb-6 px-4">
            <!-- #2 Silver -->
            <div class="ranks-podium ranks-podium--silver flex-1 max-w-[200px]">
              <div class="ranks-podium__crown text-center mb-2">
                <span class="text-3xl" style="filter:drop-shadow(0 0 6px rgba(192,192,192,0.5));">&#9733;</span>
              </div>
              <div class="ranks-podium__card relative p-4 text-center" style="background:linear-gradient(180deg,rgba(148,163,184,0.12) 0%,rgba(24,33,54,0.95) 100%);border:1px solid rgba(148,163,184,0.3);clip-path:polygon(0 8px,8px 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%);">
                <div class="text-xs font-mono text-zinc-400 uppercase tracking-widest mb-1">#2</div>
                <a :href="'/user/' + encodeURIComponent(allUserRanks[1].userName)" class="block text-sm font-bold text-mars-text truncate mb-1 hover:text-mars-cyan transition-colors">{{ allUserRanks[1].userName }}</a>
                <div class="flex justify-center"><RankTier :rankTier="allUserRanks[1].userTier" :showNumber="false"/></div>
              </div>
              <div style="height:60px;background:linear-gradient(180deg,rgba(148,163,184,0.15),rgba(148,163,184,0.03));border-left:1px solid rgba(148,163,184,0.2);border-right:1px solid rgba(148,163,184,0.2);"></div>
            </div>

            <!-- #1 Gold -->
            <div class="ranks-podium ranks-podium--gold flex-1 max-w-[220px]">
              <div class="ranks-podium__crown text-center mb-2">
                <span class="text-4xl" style="filter:drop-shadow(0 0 10px rgba(234,179,8,0.6));">&#9813;</span>
              </div>
              <div class="ranks-podium__card relative p-5 text-center" style="background:linear-gradient(180deg,rgba(234,179,8,0.12) 0%,rgba(24,33,54,0.95) 100%);border:1px solid rgba(234,179,8,0.4);clip-path:polygon(0 10px,10px 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%);box-shadow:0 0 20px rgba(234,179,8,0.1);">
                <div class="text-xs font-mono text-yellow-400 uppercase tracking-widest mb-1" style="text-shadow:0 0 6px rgba(234,179,8,0.4);">#1</div>
                <a :href="'/user/' + encodeURIComponent(allUserRanks[0].userName)" class="block text-base font-bold text-mars-text truncate mb-1 hover:text-mars-cyan transition-colors">{{ allUserRanks[0].userName }}</a>
                <div class="flex justify-center"><RankTier :rankTier="allUserRanks[0].userTier" :showNumber="false"/></div>
              </div>
              <div style="height:80px;background:linear-gradient(180deg,rgba(234,179,8,0.12),rgba(234,179,8,0.02));border-left:1px solid rgba(234,179,8,0.25);border-right:1px solid rgba(234,179,8,0.25);"></div>
            </div>

            <!-- #3 Bronze -->
            <div class="ranks-podium ranks-podium--bronze flex-1 max-w-[200px]">
              <div class="ranks-podium__crown text-center mb-2">
                <span class="text-3xl" style="filter:drop-shadow(0 0 6px rgba(180,120,60,0.5));">&#9733;</span>
              </div>
              <div class="ranks-podium__card relative p-4 text-center" style="background:linear-gradient(180deg,rgba(180,120,60,0.12) 0%,rgba(24,33,54,0.95) 100%);border:1px solid rgba(180,120,60,0.3);clip-path:polygon(0 8px,8px 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%);">
                <div class="text-xs font-mono text-amber-500 uppercase tracking-widest mb-1">#3</div>
                <a :href="'/user/' + encodeURIComponent(allUserRanks[2].userName)" class="block text-sm font-bold text-mars-text truncate mb-1 hover:text-mars-cyan transition-colors">{{ allUserRanks[2].userName }}</a>
                <div class="flex justify-center"><RankTier :rankTier="allUserRanks[2].userTier" :showNumber="false"/></div>
              </div>
              <div style="height:40px;background:linear-gradient(180deg,rgba(180,120,60,0.12),rgba(180,120,60,0.02));border-left:1px solid rgba(180,120,60,0.2);border-right:1px solid rgba(180,120,60,0.2);"></div>
            </div>
          </div>

          <!-- Rest of ranking table -->
          <div class="ranks-panel bg-mars-deep border border-mars-border p-5"
            style="clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px));">
            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead>
                  <tr class="border-b border-mars-border">
                    <th class="py-3 px-3 w-16 text-xs uppercase tracking-wider text-mars-text-faint font-mono" v-i18n>Rank</th>
                    <th class="py-3 px-3 text-xs uppercase tracking-wider text-mars-text-faint font-mono" v-i18n>User Name</th>
                    <th class="py-3 px-3 text-xs uppercase tracking-wider text-mars-text-faint font-mono" v-i18n>Tier</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(singleUserRank, index) in allUserRanks"
                      v-if="index >= 3"
                      class="border-b border-mars-border/30 transition-colors"
                      v-bind:class="{'hover:bg-mars-surface/40': true}">
                    <td class="py-2.5 px-3">
                      <div class="w-7 h-7 text-center text-sm font-mono text-mars-text-dim leading-7">{{ index + 1 }}</div>
                    </td>
                    <td class="py-2.5 px-3 text-mars-text font-medium"><a :href="'/user/' + encodeURIComponent(singleUserRank.userName)" class="hover:text-mars-cyan transition-colors hover:underline">{{ singleUserRank.userName }}</a></td>
                    <td class="py-2.5 px-3"><RankTier :rankTier="singleUserRank.userTier" :showNumber="false"/></td>
                  </tr>
                </tbody>
              </table>
              <div v-if="allUserRanks.length <= 3" class="text-center py-8 text-mars-text-faint text-sm font-mono uppercase tracking-wider" v-i18n>No additional rankings</div>
            </div>
          </div>
        </div>

        <!-- =============== TAB 2: Rank Rules =============== -->
        <div v-if="openTab === 2">
          <div class="ranks-panel bg-mars-deep border border-mars-border p-6"
            style="clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px));">
            <div class="text-xs uppercase tracking-widest text-mars-rust font-mono font-bold mb-4" v-i18n>Star Change per Placement</div>
            <div class="space-y-3">
              <div v-for="p in ['2','3','4','5']" class="ranks-rule-row flex items-start gap-4 p-3 rounded-sm transition-colors hover:bg-mars-surface/30" style="border-left:2px solid rgba(194,65,12,0.4);">
                <span class="inline-flex items-center justify-center w-10 h-10 flex-shrink-0 text-sm font-bold font-mono"
                  style="background:linear-gradient(135deg,rgba(194,65,12,0.2),rgba(194,65,12,0.05));color:#ea580c;clip-path:polygon(0 4px,4px 0,calc(100% - 4px) 0,100% 4px,100% calc(100% - 4px),calc(100% - 4px) 100%,4px 100%,0 calc(100% - 4px));">
                  {{p}}P
                </span>
                <div class="text-sm text-mars-text-dim pt-2 leading-relaxed">
                  <span v-if="p==='2'" v-i18n>First player + 1, second player -1.</span>
                  <span v-if="p==='3'" v-i18n>First player + 1, second player +0, third player -1.</span>
                  <span v-if="p==='4'" v-i18n>First player + 2, second player +1, third player +0, fourth player -1.</span>
                  <span v-if="p==='5'" v-i18n>First player + 2, second player +1, third player +0, fourth player -1, fifth player -2.</span>
                </div>
              </div>
            </div>

            <div class="mt-6 p-3 text-xs text-mars-text-faint font-mono" style="border:1px dashed rgba(46,63,94,0.6);background:rgba(11,15,26,0.4);">
              <span class="text-mars-cyan">&#9432;</span>
              <span class="ml-2" v-i18n>Iron, Bronze, Silver tier players will not lose stars on demotion.</span>
            </div>
          </div>
        </div>

        <!-- =============== TAB 3: Rank Tiers =============== -->
        <div v-if="openTab === 3">
          <div class="ranks-tiers-grid">
            <div v-for="(rankTier, idx) in rankTiers"
                 class="ranks-tier-card relative overflow-hidden transition-all"
                 :key="rankTier.name"
                 :style="getTierCardStyle(rankTier, idx)">

              <!-- Background glow -->
              <div class="absolute inset-0 opacity-20" :style="getTierGlowStyle(rankTier)"></div>

              <!-- Content -->
              <div class="relative z-10 flex items-center gap-4 p-4">
                <!-- Tier icon -->
                <div class="flex-shrink-0 flex items-center justify-center" style="min-width:50px;">
                  <RankTier :rankTier="rankTier" :showNumber="false"/>
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="text-sm font-bold uppercase tracking-wider" :style="'color:' + getTierColor(rankTier)" v-i18n>{{ rankTier.name }}</span>
                    <span v-if="rankTier.measurement==='star'" class="text-xs font-mono text-mars-text-faint">{{ rankTier.maxStars }} &#9733;</span>
                    <span v-else class="text-xs font-mono" style="color:#06b6d4;">SCORE</span>
                  </div>
                  <div class="text-xs text-mars-text-dim leading-relaxed">
                    <span v-if="rankTier.measurement==='value'">
                      最高段位 · <a href="https://www.microsoft.com/en-us/research/project/trueskill-ranking-system/" class="text-mars-cyan hover:underline">TrueSkill</a> 算法排名
                    </span>
                    <span v-else-if="rankTier.maxStars<=3" v-i18n>Protected — no star loss on defeat</span>
                    <span v-else v-i18n>Stars can be lost on defeat</span>
                  </div>
                </div>

                <!-- Tier level indicator -->
                <div class="flex-shrink-0 flex flex-col items-center">
                  <div class="text-xs font-mono text-mars-text-faint uppercase tracking-widest">Lv</div>
                  <div class="text-lg font-bold font-mono" :style="'color:' + getTierColor(rankTier)">{{ idx + 1 }}</div>
                </div>
              </div>

              <!-- Bottom accent bar -->
              <div class="absolute bottom-0 left-0 right-0 h-px" :style="'background:linear-gradient(to right,transparent,' + getTierColor(rankTier) + '40,' + getTierColor(rankTier) + '40,transparent);'"></div>
            </div>
          </div>
        </div>

      </div>

      <style>
        .ranks-tab {
          clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
          background: rgba(24,33,54,0.3);
          border: 1px solid transparent;
        }
        .ranks-tab--active {
          border-color: rgba(46,63,94,0.6);
        }
        .ranks-panel {
          position: relative;
        }
        .ranks-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 30px;
          height: 1px;
          background: #c2410c;
        }
        .ranks-panel::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 30px;
          height: 1px;
          background: #c2410c;
        }
        .ranks-tiers-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ranks-tier-card {
          border: 1px solid rgba(46,63,94,0.5);
          clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
          background: linear-gradient(135deg, rgba(24,33,54,0.9) 0%, rgba(31,43,68,0.7) 100%);
        }
        .ranks-tier-card:hover {
          border-color: rgba(46,63,94,0.8);
          transform: translateX(4px);
        }
        .ranks-podium {
          transition: transform 0.2s;
        }
        .ranks-podium:hover {
          transform: translateY(-4px);
        }
      </style>
    </div>
  `,
});

