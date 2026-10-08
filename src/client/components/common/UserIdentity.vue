<template>
  <div
    class="user-identity"
    :class="[
      `user-identity--${size}`,
      `user-identity--${layout}`,
      { 'user-identity--vip': vip },
    ]"
  >
    <div class="user-identity__avatar" :style="avatarStyle" :aria-label="name">
      {{ avatarLetter }}
    </div>

    <div class="user-identity__body">
      <div class="user-identity__heading">
        <span class="user-identity__name">{{ name }}</span>
        <span v-if="vip" class="user-identity__vip">
          <TfmIcon name="star" :size="size === 'lg' ? 13 : 11" />
          <span v-i18n>VIP</span>
        </span>
        <slot name="badge"></slot>
      </div>

      <div v-if="detail || $slots.detail" class="user-identity__detail">
        <slot name="detail">{{ detail }}</slot>
      </div>

      <div v-if="rankTier" class="user-identity__rank">
        <RankBadge :rankTier="rankTier" :showName="true" :vertical="rankVertical" />
      </div>
      <div v-else-if="rankLabel" class="user-identity__rank-status" v-i18n>{{ rankLabel }}</div>

      <slot name="meta"></slot>
      <slot></slot>
    </div>

    <div v-if="$slots.footer" class="user-identity__footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {RankTier} from '@/common/rank/RankTier';
import RankBadge from '@/client/components/common/RankBadge.vue';
import TfmIcon from '@/client/components/common/TfmIcon.vue';

export default defineComponent({
  name: 'UserIdentity',
  components: {
    RankBadge,
    TfmIcon,
  },
  props: {
    name: {
      type: String,
      required: true,
    },
    detail: {
      type: String,
      default: '',
    },
    rankTier: {
      type: Object as () => RankTier | null,
      default: null,
    },
    rankLabel: {
      type: String,
      default: '',
    },
    rankVertical: {
      type: Boolean,
      default: false,
    },
    vip: {
      type: Boolean,
      default: false,
    },
    size: {
      type: String,
      default: 'md',
      validator: (value: string) => ['sm', 'md', 'lg'].includes(value),
    },
    layout: {
      type: String,
      default: 'row',
      validator: (value: string) => ['row', 'stacked'].includes(value),
    },
  },
  computed: {
    avatarLetter(): string {
      return this.name ? this.name.charAt(0).toUpperCase() : '?';
    },
    avatarStyle(): Record<string, string> {
      const start = this.vip ? '#fcd34d' : '#e2520e';
      const middle = this.vip ? '#f59e0b' : '#f97316';
      const end = this.vip ? '#d97706' : '#c2410c';
      return {
        background: `linear-gradient(135deg, ${start}, ${middle}, ${end})`,
        border: this.vip ?
          '2px solid rgba(251, 191, 36, .72)' :
          '2px solid rgba(255, 255, 255, .2)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, .3)',
      };
    },
  },
});
</script>

<style scoped>
.user-identity {
  align-items: center;
  display: flex;
  gap: 12px;
  min-width: 0;
  color: var(--portal-text, #f1f5f9);
}

.user-identity--stacked {
  flex-direction: column;
  text-align: center;
}

.user-identity__avatar {
  align-items: center;
  box-sizing: border-box;
  border-radius: 50%;
  color: #fff;
  display: flex;
  flex: 0 0 auto;
  font-weight: 800;
  justify-content: center;
  text-shadow: 0 2px 6px rgba(0, 0, 0, .4);
}

.user-identity--sm .user-identity__avatar {
  font-size: 18px;
  height: 44px;
  width: 44px;
}

.user-identity--md .user-identity__avatar {
  font-size: 24px;
  height: 56px;
  width: 56px;
}

.user-identity--lg .user-identity__avatar {
  font-size: 34px;
  height: 84px;
  width: 84px;
}

.user-identity__body {
  min-width: 0;
}

.user-identity--stacked .user-identity__body {
  width: 100%;
}

.user-identity__heading {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.user-identity--stacked .user-identity__heading {
  justify-content: center;
}

.user-identity__name {
  color: var(--portal-text, #f1f5f9);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.user-identity--sm .user-identity__name {
  font-size: 15px;
}

.user-identity--lg .user-identity__name {
  font-size: clamp(1.7rem, 4vw, 2.15rem);
}

.user-identity--vip .user-identity__name {
  background: linear-gradient(135deg, #fcd34d, #f59e0b, #d97706);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.user-identity__vip {
  align-items: center;
  background: rgba(251, 191, 36, .13);
  border: 1px solid rgba(251, 191, 36, .35);
  border-radius: 999px;
  color: #fbbf24;
  display: inline-flex;
  font-size: 10px;
  font-weight: 800;
  gap: 4px;
  letter-spacing: .05em;
  padding: 3px 8px;
}

.user-identity__detail {
  color: var(--portal-muted, #a6b3c7);
  font-size: 12px;
  line-height: 1.4;
  margin-top: 5px;
}

.user-identity__rank {
  display: flex;
  justify-content: flex-start;
  margin-top: 7px;
}

.user-identity--stacked .user-identity__rank {
  justify-content: center;
}

.user-identity--lg .user-identity__rank {
  margin-top: 8px;
}

.user-identity__rank-status {
  color: var(--portal-muted, #a6b3c7);
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  margin-top: 7px;
  text-transform: uppercase;
}

.user-identity--stacked .user-identity__rank-status {
  text-align: center;
}

.user-identity__footer {
  flex: 0 0 auto;
}

.user-identity--stacked .user-identity__footer {
  width: 100%;
}

@media (max-width: 640px) {
  .user-identity--lg {
    flex-direction: column;
    text-align: center;
  }

  .user-identity--lg .user-identity__body {
    width: 100%;
  }

  .user-identity--lg .user-identity__heading,
  .user-identity--lg .user-identity__rank {
    justify-content: center;
  }
}
</style>
