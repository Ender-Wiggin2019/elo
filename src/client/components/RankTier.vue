<template>
  <div class='tier-container' v-i18n>
  <div :class="'tooltip tooltip-top tier-type tier-' + this.rankTier.name" :data-tooltip="$t(this.rankTier.name)"></div>
    <div class='stars-container' v-if="this.rankTier.measurement==='star' && (this.showNumber===false || this.showNumber===undefined)">
      <span v-for="index in this.rankTier.stars" :key="'light'+index" class='tier-star star-light'></span>
      <span v-for="index in (this.rankTier.maxStars-this.rankTier.stars)" :key="'dark'+index" class='tier-star star-dark'></span>
    </div>
    <div class='star-value-container' v-if="this.rankTier.measurement==='star' && this.showNumber===true">{{ this.rankTier.stars }}</div>
    <div class='rank-value-container' v-if="this.rankTier.measurement==='value'">{{ displayRankValue }}</div>
  </div>
</template>

<script lang="ts">

import Vue from 'vue';
import {RankTier} from '../../common/RankManager';

export default Vue.extend({
  name: 'RankTier',
  props: {
    rankTier: {
      type: Object as () => RankTier,
    },
    showNumber: {
      type: Boolean,
    },
    // hideZeroTags: {
    //   type: Boolean,
    // },
    // isTopBar: {
    //   type: Boolean,
    //   default: false,
    // },
    // conciseTagsViewDefaultValue: {
    //   type: Boolean,
    //   required: false,
    //   default: true,
    // },
  },
  data() {
    return {
      displayRankValue: Math.round(this.rankTier?.value | 0),
    };
  },
});

</script>
