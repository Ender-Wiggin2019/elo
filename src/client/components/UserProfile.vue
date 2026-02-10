<template>
  <div class="min-h-screen bg-mars-void text-mars-text p-4 sm:p-6 lg:p-8"
    style="background-image: radial-gradient(ellipse at 50% 0%, rgba(194,65,12,0.10) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(6,182,212,0.04) 0%, transparent 40%), linear-gradient(rgba(30,42,66,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(30,42,66,0.25) 1px, transparent 1px); background-size: 100% 100%, 100% 100%, 40px 40px, 40px 40px;">
    <div class="max-w-3xl mx-auto">

      <!-- Header -->
      <div class="flex items-center gap-2 mb-1">
        <a href="/" class="text-mars-rust hover:text-mars-ember transition-colors text-sm font-semibold uppercase tracking-widest" v-i18n>Terraforming Mars</a>
        <span class="text-mars-text-faint text-xs">&#9656;</span>
        <span class="text-sm font-bold text-mars-text uppercase tracking-widest" v-i18n>Profile</span>
      </div>
      <div class="mb-6" style="height:1px;background:linear-gradient(to right,rgba(194,65,12,0.7),rgba(194,65,12,0.3) 25%,rgba(46,63,94,0.5) 55%,transparent 100%);"></div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-20">
        <div class="text-mars-text-faint text-sm font-mono uppercase tracking-widest" v-i18n>Loading profile...</div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-20">
        <div class="text-mars-red text-sm font-mono uppercase tracking-widest mb-2">{{ error }}</div>
        <a href="/" class="text-mars-cyan text-xs hover:underline font-mono uppercase" v-i18n>Back to Home</a>
      </div>

      <!-- Profile Content -->
      <div v-else-if="profile" class="space-y-6">

        <!-- Main Profile Card -->
        <div class="profile-card relative overflow-hidden">
          <!-- Background glow -->
          <div class="absolute inset-0" style="background:radial-gradient(ellipse at 20% 30%, rgba(194,65,12,0.08) 0%, transparent 60%);"></div>

          <div class="relative z-10 p-6 sm:p-8">
            <div class="flex items-start gap-5">
              <!-- Large Avatar -->
              <div class="flex-shrink-0 w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold uppercase"
                :style="avatarStyle">
                {{ avatarLetter }}
              </div>

              <!-- Name & Rank -->
              <div class="flex-1 min-w-0 pt-1">
                <div class="flex items-center gap-3 mb-1">
                  <h1 class="text-2xl font-bold truncate"
                    :class="profile.isvip > 0 ? 'vip-name' : 'text-mars-text'">{{ profile.name }}</h1>
                  <span v-if="profile.isvip > 0" class="inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-sm"
                    :class="profile.isvip === 2 ? 'bg-mars-amber/20 text-mars-amber' : 'bg-mars-amber/15 text-mars-amber'">
                    VIP
                  </span>
                </div>

                <!-- Rank display -->
                <div v-if="profile.rank" class="flex items-center gap-3 mb-2">
                  <RankTier :rankTier="rankTierObj" :showNumber="false"/>
                  <span class="text-sm font-mono text-mars-text-dim uppercase tracking-wider">{{ profile.rank.tier.name }}</span>
                </div>
                <div v-else class="text-sm text-mars-text-faint font-mono uppercase tracking-wider mb-2" v-i18n>Unranked</div>

                <!-- Join date -->
                <div v-if="profile.createtime" class="text-xs text-mars-text-faint font-mono">
                  <span v-i18n>Joined</span>: {{ profile.createtime }}
                </div>
              </div>
            </div>
          </div>

          <!-- Corner accents -->
          <div class="absolute top-0 left-0 w-8 h-px bg-mars-rust"></div>
          <div class="absolute top-0 left-0 w-px h-8 bg-mars-rust"></div>
          <div class="absolute bottom-0 right-0 w-8 h-px bg-mars-rust"></div>
          <div class="absolute bottom-0 right-0 w-px h-8 bg-mars-rust"></div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="stat-card p-4 text-center">
            <div class="text-xs font-mono text-mars-text-faint uppercase tracking-widest mb-1" v-i18n>Games</div>
            <div class="text-2xl font-bold font-mono text-mars-text">{{ profile.totalGames }}</div>
          </div>
          <div class="stat-card p-4 text-center">
            <div class="text-xs font-mono text-mars-text-faint uppercase tracking-widest mb-1" v-i18n>Win Rate</div>
            <div class="text-2xl font-bold font-mono text-mars-teal">{{ mockWinRate }}</div>
          </div>
          <div class="stat-card p-4 text-center">
            <div class="text-xs font-mono text-mars-text-faint uppercase tracking-widest mb-1" v-i18n>Flee Rate</div>
            <div class="text-2xl font-bold font-mono" :class="mockFleeRateClass">{{ mockFleeRate }}</div>
          </div>
          <div class="stat-card p-4 text-center" v-if="profile.rank">
            <div class="text-xs font-mono text-mars-text-faint uppercase tracking-widest mb-1" v-i18n>Rating</div>
            <div class="text-2xl font-bold font-mono text-mars-cyan">{{ displayRating }}</div>
          </div>
          <div class="stat-card p-4 text-center" v-else>
            <div class="text-xs font-mono text-mars-text-faint uppercase tracking-widest mb-1" v-i18n>Rating</div>
            <div class="text-2xl font-bold font-mono text-mars-text-dim">—</div>
          </div>
        </div>

        <!-- Rank Details -->
        <div v-if="profile.rank" class="profile-card relative overflow-hidden">
          <div class="relative z-10 p-5">
            <div class="text-xs uppercase tracking-widest text-mars-rust font-mono font-bold mb-4" v-i18n>Rank Details</div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <div class="text-xs font-mono text-mars-text-faint uppercase tracking-wider mb-0.5" v-i18n>Tier</div>
                <div class="text-sm font-bold text-mars-text">{{ profile.rank.tier.name }}</div>
              </div>
              <div v-if="profile.rank.tier.measurement === 'star'">
                <div class="text-xs font-mono text-mars-text-faint uppercase tracking-wider mb-0.5" v-i18n>Stars</div>
                <div class="text-sm font-bold text-mars-text">{{ profile.rank.tier.stars }} / {{ profile.rank.tier.maxStars }}</div>
              </div>
              <div v-if="profile.rank.tier.measurement === 'value'">
                <div class="text-xs font-mono text-mars-text-faint uppercase tracking-wider mb-0.5" v-i18n>TrueSkill</div>
                <div class="text-sm font-bold text-mars-cyan">{{ Math.round(profile.rank.trueskill * 100) }}</div>
              </div>
              <div>
                <div class="text-xs font-mono text-mars-text-faint uppercase tracking-wider mb-0.5" v-i18n>Rank Value</div>
                <div class="text-sm font-bold text-mars-text">{{ profile.rank.rankValue }}</div>
              </div>
              <div>
                <div class="text-xs font-mono text-mars-text-faint uppercase tracking-wider mb-0.5" v-i18n>Season Points</div>
                <div class="text-sm font-bold text-mars-text">{{ profile.rank.points }}</div>
              </div>
              <div v-if="profile.rank.seasonId">
                <div class="text-xs font-mono text-mars-text-faint uppercase tracking-wider mb-0.5" v-i18n>Season</div>
                <div class="text-sm font-bold text-mars-text-dim">{{ profile.rank.seasonId }}</div>
              </div>
            </div>
          </div>

          <!-- Accent -->
          <div class="absolute top-0 left-0 w-6 h-px bg-mars-rust"></div>
          <div class="absolute bottom-0 right-0 w-6 h-px bg-mars-rust"></div>
        </div>

      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import {RankTier} from '@/common/rank/RankTier';
import RankTierComponent from '@/client/components/RankTier.vue';

// Mock constants
const MOCK_WIN_RATE = 0.42;
const MOCK_FLEE_RATE = 0.03;

interface IProfileRank {
  rankValue: number;
  mu: number;
  sigma: number;
  trueskill: number;
  points: number;
  seasonId: string;
  tier: {
    name: string;
    measurement: string;
    maxStars: number;
    stars: number;
    value: number;
  };
}

interface IProfile {
  id: string;
  name: string;
  createtime: string;
  isvip: number;
  rank: IProfileRank | null;
  totalGames: number;
}

export default Vue.extend({
  name: 'UserProfile',
  components: {
    RankTier: RankTierComponent,
  },
  props: {
    identifier: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      loading: true,
      error: '' as string,
      profile: null as IProfile | null,
    };
  },
  computed: {
    avatarLetter(): string {
      return this.profile ? this.profile.name.charAt(0).toUpperCase() : '?';
    },
    avatarStyle(): Record<string, string> {
      const isVip = this.profile && this.profile.isvip > 0;
      return {
        background: isVip
          ? 'linear-gradient(135deg, #eab308, #d97706)'
          : 'linear-gradient(135deg, #c2410c, #c2410c88)',
        color: '#fff',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
        boxShadow: isVip ? '0 0 16px rgba(234,179,8,0.3)' : 'none',
      };
    },
    rankTierObj(): RankTier | null {
      if (!this.profile?.rank) return null;
      const t = this.profile.rank.tier;
      return new RankTier(
        t.name as any,
        t.measurement as 'star' | 'value',
        t.maxStars,
        t.stars,
        t.value,
      );
    },
    mockWinRate(): string {
      return (MOCK_WIN_RATE * 100).toFixed(1) + '%';
    },
    mockFleeRate(): string {
      return (MOCK_FLEE_RATE * 100).toFixed(1) + '%';
    },
    mockFleeRateClass(): string {
      return MOCK_FLEE_RATE <= 0.05 ? 'text-mars-teal' : 'text-mars-red';
    },
    displayRating(): string {
      if (!this.profile?.rank) return '—';
      if (this.profile.rank.tier.measurement === 'value') {
        return String(Math.round(this.profile.rank.trueskill * 100));
      }
      return String(this.profile.rank.rankValue);
    },
  },
  mounted() {
    this.fetchProfile();
  },
  watch: {
    identifier() {
      this.fetchProfile();
    },
  },
  methods: {
    fetchProfile() {
      this.loading = true;
      this.error = '';
      this.profile = null;

      fetch(`/api/v2/user-profile/${encodeURIComponent(this.identifier)}`)
        .then((res) => {
          if (!res.ok) {
            return res.json().then((data: any) => {
              throw new Error(data.error || 'User not found');
            });
          }
          return res.json();
        })
        .then((data: IProfile) => {
          this.profile = data;
        })
        .catch((err: Error) => {
          this.error = err.message || 'Failed to load profile';
        })
        .finally(() => {
          this.loading = false;
        });
    },
  },
});
</script>

<style scoped>
.profile-card {
  background: linear-gradient(135deg, #182136 0%, #1f2b44 100%);
  border: 1px solid #2e3f5e;
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
}

.stat-card {
  background: linear-gradient(135deg, rgba(24,33,54,0.9) 0%, rgba(31,43,68,0.7) 100%);
  border: 1px solid rgba(46,63,94,0.5);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  transition: border-color 0.2s;
}

.stat-card:hover {
  border-color: rgba(194,65,12,0.3);
}

.vip-name {
  background: linear-gradient(135deg, #eab308, #fbbf24, #d97706);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 6px rgba(234, 179, 8, 0.3));
}
</style>
