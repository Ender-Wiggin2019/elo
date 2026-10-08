<template>
  <div class="start-screen portal-enter">
    <header class="start-screen-header">
      <p class="start-screen-header__label" v-if="userName" v-i18n>Welcome, Commander</p>
      <p class="start-screen-header__label" v-else>Terraforming</p>
      <h1 class="start-screen-header__name">{{ userName || 'Mars' }}</h1>
    </header>

    <nav class="start-screen-links" :aria-label="$t('Home')">
      <a v-for="destination in destinations" :key="destination.key"
         class="start-screen-link" :class="'start-screen-link--' + destination.key"
         :href="destination.href" :target="destination.target" :rel="destination.target ? 'noopener' : undefined">
        <span v-i18n>{{ destination.label }}</span>
        <span class="start-screen-link__arrow" aria-hidden="true">→</span>
      </a>
    </nav>

    <footer class="start-screen-footer">
      <TfmButton variant="ghost" size="sm" href="/help" target="_blank" rel="noopener"><span v-i18n>Help</span></TfmButton>
      <language-switcher />
      <details class="start-screen-build">
        <summary v-i18n>version</summary>
        <div><span v-i18n>deployed</span>: {{ raw_settings.builtAt }}<br>{{ raw_settings.head }}</div>
      </details>
    </footer>
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import LanguageSwitcher from '@/client/components/LanguageSwitcher.vue';
import TfmButton from '@/client/components/common/TfmButton.vue';

import raw_settings from '@/genfiles/settings.json';
import {PreferencesManager} from '@/client/utils/PreferencesManager';

export default defineComponent({
  name: 'start-screen',
  data: function() {
    return {
      userName: '',
    };
  },
  components: {
    LanguageSwitcher,
    TfmButton,
  },
  computed: {
    destinations(): Array<{key: string; label: string; href: string; target?: string}> {
      return [
        {key: 'new-game', label: 'New game', href: '/new-game'},
        {key: 'lobby', label: 'Game Lobby', href: '/lobby'},
        {key: 'me', label: this.userName ? 'My Space' : 'Sign In', href: this.userName ? '/me' : '/login'},
        {key: 'donate', label: 'Donate', href: '/donate'},
        {key: 'cards', label: 'Cards list', href: '/cards', target: '_blank'},
        {key: 'ranking', label: 'Tier Ranking', href: '/ranks', target: '_blank'},
      ];
    },
    raw_settings(): typeof raw_settings {
      return raw_settings;
    },
  },
  mounted: function() {
    this.userName = PreferencesManager.load('userName');
  },
});

</script>
