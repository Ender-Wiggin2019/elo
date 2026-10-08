<template>
  <component
    :is="href ? 'a' : 'button'"
    :href="isDisabled ? undefined : href"
    :type="href ? undefined : type"
    :aria-disabled="isDisabled || undefined"
    :aria-busy="loading || undefined"
    :tabindex="isDisabled ? -1 : undefined"
    :disabled="isDisabled"
    :class="buttonClass"
    class="tfm-button"
    @click="onClick"
  >
    <slot></slot>
  </component>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'TfmButton',
  emits: ['click'],
  props: {
    variant: {
      type: String,
      default: 'outline',
      validator: (v: string) => ['primary', 'outline', 'ghost', 'danger', 'success', 'teal', 'cyan'].includes(v),
    },
    size: {
      type: String,
      default: 'md',
      validator: (v: string) => ['sm', 'md', 'lg', 'icon'].includes(v),
    },
    block: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    loading: {type: Boolean, default: false},
    type: {type: String, default: 'button'},
    href: {
      type: String,
      default: '',
    },
  },
  methods: {
    onClick(event: MouseEvent) {
      if (this.isDisabled) {
        event.preventDefault();
        return;
      }
      this.$emit('click', event);
    },
  },
  computed: {
    isDisabled(): boolean {
      return this.disabled || this.loading;
    },
    buttonClass(): Record<string, boolean> {
      return {
        [`tfm-button--${this.variant}`]: true,
        [`tfm-button--${this.size}`]: true,
        'tfm-button--block': this.block,
        'tfm-button--disabled': this.isDisabled,
        'tfm-button--loading': this.loading,
      };
    },
  },
});
</script>

<style scoped>
.tfm-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--portal-border, #263050);
  border-radius: 9px;
  font-family: inherit;
  font-weight: 600;
  line-height: 1.5;
  text-decoration: none;
  cursor: pointer;
  transition: background .2s, border-color .2s, color .2s, transform .2s;
}

.tfm-button--icon {
  width: 38px;
  height: 38px;
  padding: 0;
  flex: 0 0 auto;
}

.tfm-button--sm {
  padding: 7px 12px;
  font-size: 12px;
}

.tfm-button--md {
  padding: 10px 18px;
  font-size: 14px;
}

.tfm-button--lg {
  padding: 13px 22px;
  font-size: 15px;
}

.tfm-button--block {
  display: flex;
  width: 100%;
}

.tfm-button--primary {
  background: #ed7840;
  border-color: #ed7840;
  color: #18100c;
}

.tfm-button--primary:hover:not(.tfm-button--disabled) {
  background: #ff985d;
  border-color: #ff985d;
}

.tfm-button--outline {
  background: var(--portal-surface, #121b2b);
  color: #cbd5e1;
}

.tfm-button--outline:hover:not(.tfm-button--disabled) {
  background: var(--portal-elevated, #1a2639);
  border-color: #64748b;
  color: #f1f5f9;
}

.tfm-button--ghost {
  background: transparent;
  border-color: transparent;
  color: #a6b3c7;
}

.tfm-button--ghost:hover:not(.tfm-button--disabled) {
  background: rgba(255,255,255,.06);
  color: #f1f5f9;
}

.tfm-button--danger {
  background: rgba(239,68,68,.07);
  border-color: rgba(239,68,68,.3);
  color: #fda4a4;
}

.tfm-button--danger:hover:not(.tfm-button--disabled) {
  background: rgba(239,68,68,.15);
  border-color: #ef4444;
}

.tfm-button--success,
.tfm-button--teal {
  background: rgba(45,212,191,.07);
  border-color: rgba(45,212,191,.3);
  color: #77e3d4;
}

.tfm-button--success:hover:not(.tfm-button--disabled),
.tfm-button--teal:hover:not(.tfm-button--disabled) {
  background: rgba(45,212,191,.15);
}

.tfm-button--cyan {
  background: rgba(34,211,238,.07);
  border-color: rgba(34,211,238,.3);
  color: #80dceb;
}

.tfm-button--cyan:hover:not(.tfm-button--disabled) {
  background: rgba(34,211,238,.15);
}

.tfm-button:active:not(.tfm-button--disabled) {
  transform: translateY(1px);
}

.tfm-button:focus-visible {
  outline: 2px solid #f48146;
  outline-offset: 3px;
}

.tfm-button--disabled {
  opacity: .45;
  cursor: not-allowed;
}

.tfm-button--loading::after {
  content: '';
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: 3px;
  height: 2px;
  border-radius: 2px;
  background: currentColor;
  animation: button-pending .9s ease-in-out infinite alternate;
}
@keyframes button-pending { to { opacity: .25; } }

@media (prefers-reduced-motion: reduce) {
  .tfm-button {
    transition: none;
  }
  .tfm-button--loading::after { animation: none; }
}
</style>
