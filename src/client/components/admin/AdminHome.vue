<template>
  <div class="admin-home portal-page">
    <h1 class="portal-heading">Administration</h1>
    <ul class="admin-links">
      <li v-for="path of paths" v-bind:key="path">
        <a :href="path + '?serverId=' + serverId" target="_blank">{{path}} <span aria-hidden="true">↗</span></a>
      </li>
    </ul>
    <section class="admin-season portal-panel">
      <h3>Season Admin</h3>
      <div class="admin-actions">
        <TfmButton @click="triggerSeasonReset(true)">Dry Run Season Reset</TfmButton>
        <TfmButton variant="danger" @click="triggerSeasonReset(false)">Execute Season Reset</TfmButton>
      </div>
      <pre v-if="seasonResetResult" class="admin-result">
        {{ seasonResetResult }}
      </pre>
    </section>

    <!-- Season Reset Confirm Dialog -->
    <confirm-dialog
      ref="confirmDialog"
      :message="confirmMessage"
      v-on:accept="onConfirmAccept"
      v-on:dismiss="onConfirmDismiss">
    </confirm-dialog>

    <!-- Final Confirm Dialog -->
    <confirm-dialog
      ref="finalConfirmDialog"
      :message="finalConfirmMessage"
      v-on:accept="onFinalConfirmAccept"
      v-on:dismiss="onFinalConfirmDismiss">
    </confirm-dialog>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {paths} from '@/common/app/paths';
import {request, RequestError} from '@/client/utils/request';
import ConfirmDialog from '../common/ConfirmDialog.vue';
import TfmButton from '../common/TfmButton.vue';

export default defineComponent({
  name: 'admin-home',
  components: {
    'confirm-dialog': ConfirmDialog,
    TfmButton,
  },
  data() {
    return {
      paths: [
        paths.API_STATS,
        paths.GAMES_OVERVIEW,
        paths.API_GAMES,
        paths.LOAD,
        paths.API_IPS,
      ],
      seasonResetResult: '',
      currentSeasonInfo: null as any,
      pendingDryRun: false as boolean | null,
      confirmMessage: '',
      finalConfirmMessage: '',
    };
  },
  computed: {
    serverId(): string {
      const search = new URLSearchParams(window.location.search);
      return search.get('serverId') || search.get('id') || '';
    },
  },
  mounted() {
    this.loadCurrentSeasonInfo();
  },
  methods: {
    async loadCurrentSeasonInfo() {
      try {
        const response = await fetch('/api/v2/season/info');
        if (response.ok) {
          const data = await response.json();
          this.currentSeasonInfo = data;
        }
      } catch (error) {
        console.error('Failed to load season info:', error);
      }
    },
    triggerSeasonReset(this: any, dryRun: boolean) {
      if (!this.currentSeasonInfo) {
        this.seasonResetResult = 'Error: Season info not loaded. Please refresh the page.';
        return;
      }
      const currentSeasonId = this.currentSeasonInfo.seasonId;
      this.pendingDryRun = dryRun;

      if (dryRun) {
        this.confirmMessage = `Dry run season reset from ${currentSeasonId}? This will show a preview without making changes.`;
        (this as any).$refs.confirmDialog.show();
      } else {
        this.confirmMessage = `Execute season reset from ${currentSeasonId}? This will move all players to the next season.`;
        (this as any).$refs.confirmDialog.show();
      }
    },
    onConfirmAccept() {
      if (this.pendingDryRun) {
        this.executeSeasonReset(true);
      } else {
        // Show final confirmation for actual reset
        const currentSeasonId = this.currentSeasonInfo.seasonId;
        this.finalConfirmMessage = `CONFIRM: This will irreversibly reset season ${currentSeasonId} to the next season. Are you absolutely sure?`;
        (this as any).$refs.finalConfirmDialog.show();
      }
    },
    onConfirmDismiss() {
      this.pendingDryRun = null;
      this.confirmMessage = '';
    },
    onFinalConfirmAccept() {
      this.executeSeasonReset(false);
    },
    onFinalConfirmDismiss() {
      this.pendingDryRun = null;
      this.finalConfirmMessage = '';
    },
    executeSeasonReset(this: any, dryRun: boolean) {
      if (!this.currentSeasonInfo) {
        return;
      }
      const currentSeasonId = this.currentSeasonInfo.seasonId;
      request.post('/api/v2/season/admin/reset?serverId=' + encodeURIComponent(this.serverId), {
        dryRun,
        expectedFromSeasonId: currentSeasonId,
      }).then((payload: any) => {
        this.seasonResetResult = JSON.stringify(payload, null, 2);
      }).catch((error) => {
        if (error instanceof RequestError) {
          this.seasonResetResult = error.body || error.message;
          return;
        }
        this.seasonResetResult = String(error);
      }).finally(() => {
        this.pendingDryRun = null;
        this.confirmMessage = '';
        this.finalConfirmMessage = '';
      });
    },
  },
});
</script>

<style scoped>
.admin-home {
  width: min(1024px, 100%);
  margin: 0 auto;
}

.admin-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin: 0 0 28px;
  padding: 0;
  list-style: none;
}

.admin-links li {
  margin: 0;
}

.admin-links a {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 22px;
  border-radius: 12px;
  border: 1px solid var(--portal-border);
  background: var(--portal-surface);
  color: var(--portal-text);
  text-decoration: none;
  font-size: 14px;
  transition: background .2s, border-color .2s;
}

.admin-links a:hover {
  background: var(--portal-elevated);
  border-color: var(--portal-accent);
}

.admin-links a:active {
  transform: translateY(1px);
}

.admin-links a:focus-visible {
  outline: 2px solid var(--portal-accent);
  outline-offset: 3px;
}

.admin-links span {
  color: var(--portal-accent);
}

.admin-season {
  padding: clamp(24px, 4vw, 36px);
}

.admin-season h3 {
  margin: 0 0 24px;
  font-size: 22px;
  font-weight: 500;
}

.admin-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.admin-result {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 24px 0 0;
  color: var(--portal-muted);
  font-size: 13px;
}
</style>
