<template>
  <div class="admin-home">
    <ul>
      <li v-for="path of paths" v-bind:key="path">
        <a :href="path + '?serverId=' + serverId" target="_blank">{{path}}</a>
      </li>
    </ul>
    <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #334155;">
      <h3>Season Admin</h3>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button @click="triggerSeasonReset(true)">Dry Run Season Reset</button>
        <button @click="triggerSeasonReset(false)">Execute Season Reset</button>
      </div>
      <div v-if="seasonResetResult" style="margin-top: 8px; white-space: pre-wrap; font-family: monospace;">
        {{ seasonResetResult }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import {paths} from '@/common/app/paths';
import {request, RequestError} from '@/client/utils/request';

export default Vue.extend({
  name: 'admin-home',
  data() {
    return {
      paths: [
        paths.API_STATS,
        paths.GAMES_OVERVIEW,
        paths.API_GAMES,
        paths.API_METRICS,
        paths.LOAD,
        paths.API_IPS,
      ],
      seasonResetResult: '',
    };
  },
  computed: {
    serverId(): string {
      const search = new URLSearchParams(window.location.search);
      return search.get('serverId') || search.get('id') || '';
    },
  },
  methods: {
    triggerSeasonReset(this: any, dryRun: boolean) {
      const expectedFromSeasonId = window.prompt('Input expected from season id (e.g. 2026-S1):', '');
      if (expectedFromSeasonId === null || expectedFromSeasonId.trim() === '') {
        return;
      }
      if (!dryRun) {
        const confirmed = window.confirm(`Confirm season reset from ${expectedFromSeasonId}? This operation is irreversible.`);
        if (!confirmed) {
          return;
        }
      }
      request.post('/api/v2/season/admin/reset?serverId=' + encodeURIComponent(this.serverId), {
        dryRun,
        expectedFromSeasonId,
      }).then((payload: any) => {
        this.seasonResetResult = JSON.stringify(payload, null, 2);
      }).catch((error) => {
        if (error instanceof RequestError) {
          this.seasonResetResult = error.body || error.message;
          alert(error.body || 'Season reset failed');
          return;
        }
        this.seasonResetResult = String(error);
        alert('Unexpected server response');
      });
    },
  },
});
</script>
