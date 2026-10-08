<template>
  <div class="tfm-navbar-wrapper">
    <nav class="tfm-navbar">
      <div class="tfm-navbar__inner">
        <!-- Left: Back button + Brand -->
        <div class="tfm-navbar__left">
          <button
            class="tfm-navbar__back"
            @click="goBack"
            :title="$t('Go back')"
            :aria-label="$t('Go back')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <a href="/" class="tfm-navbar__brand">
            <span class="tfm-navbar__brand-text" v-i18n>TFM</span>
            <span class="tfm-navbar__brand-orbit" aria-hidden="true"></span>
          </a>
        </div>

        <!-- Center: Navigation links (desktop) -->
        <div class="tfm-navbar__links">
          <a
            v-for="link in navLinks"
            :key="link.path"
            :href="link.path"
            class="tfm-navbar__link"
            :class="{ 'tfm-navbar__link--active': isActive(link.path) }"
            :aria-current="isActive(link.path) ? 'page' : undefined"
            @click.prevent="navigate(link.path)"
          >
            <span class="tfm-navbar__link-icon"><tfm-icon :name="link.icon" :size="16" /></span>
            <span class="tfm-navbar__link-label" v-i18n>{{ link.label }}</span>
          </a>
        </div>

        <!-- Right: User area + hamburger -->
        <div class="tfm-navbar__right">
          <template v-if="userName">
            <a href="/me" class="tfm-navbar__user" @click.prevent="navigate('/me')">
              <span class="tfm-navbar__avatar">{{ avatarLetter }}</span>
              <span class="tfm-navbar__username">{{ userName }}</span>
            </a>
          </template>
          <template v-else>
            <a href="/login" class="tfm-navbar__login" @click.prevent="navigate('/login')" v-i18n>Sign In</a>
          </template>

          <!-- Hamburger toggle (mobile only) -->
          <button class="tfm-navbar__hamburger" :aria-label="$t('Menu')" :aria-expanded="mobileMenuOpen" aria-controls="portal-navigation" @click="toggleMobileMenu" :class="{'tfm-navbar__hamburger--open': mobileMenuOpen}">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Mobile overlay modal — placed OUTSIDE nav to avoid stacking context issues -->
    <dialog ref="mobileMenu" id="portal-navigation" class="tfm-navbar__overlay" :aria-label="$t('Menu')" @click.self="mobileMenuOpen = false" @cancel="mobileMenuOpen = false" @close="mobileMenuOpen = false">
      <div class="tfm-navbar__modal">
        <!-- Modal header -->
        <div class="tfm-navbar__modal-header">
          <span class="tfm-navbar__brand-text" v-i18n>TFM</span>
          <button class="tfm-navbar__modal-close" :aria-label="$t('Close')" @click="mobileMenuOpen = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Navigation links -->
        <div class="tfm-navbar__modal-links">
          <a
            v-for="link in navLinks"
            :key="'m-' + link.path"
            :href="link.path"
            class="tfm-navbar__modal-link"
            :class="{ 'tfm-navbar__modal-link--active': isActive(link.path) }"
            @click.prevent="navigateMobile(link.path)"
          >
            <span class="tfm-navbar__modal-link-icon"><tfm-icon :name="link.icon" :size="18" /></span>
            <span v-i18n>{{ link.label }}</span>
          </a>
        </div>

        <!-- User section in modal -->
        <div class="tfm-navbar__modal-footer">
          <template v-if="userName">
            <a href="/me" class="tfm-navbar__modal-user" @click.prevent="navigateMobile('/me')">
              <span class="tfm-navbar__avatar">{{ avatarLetter }}</span>
              <span class="tfm-navbar__modal-user-name">{{ userName }}</span>
            </a>
          </template>
          <template v-else>
            <a href="/login" class="tfm-navbar__modal-signin" @click.prevent="navigateMobile('/login')" v-i18n>Sign In</a>
          </template>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import {userStore} from '@/client/stores';
import TfmIcon from '@/client/components/common/TfmIcon.vue';
import {showModal, windowHasHTMLDialogElement} from '@/client/components/HTMLDialogElementCompatibility';
import dialogPolyfill from 'dialog-polyfill';

export default defineComponent({
  name: 'NavBar',
  components: {
    TfmIcon,
  },
  data() {
    return {
      userName: '' as string,
      currentPath: '' as string,
      mobileMenuOpen: false,
      unsubscribe: null as (() => void) | null,
    };
  },
  computed: {
    avatarLetter(): string {
      return userStore.avatarLetter;
    },
    navLinks(): Array<{ path: string; label: string; icon: string }> {
      return [
        {path: '/', label: 'Home', icon: 'home'},
        {path: '/lobby', label: 'Lobby', icon: 'lobby'},
        {path: '/me', label: 'My Space', icon: 'user'},
        {path: '/ranks', label: 'Ranks', icon: 'trophy'},
        {path: '/cards', label: 'Cards', icon: 'cards'},
      ];
    },
  },
  mounted() {
    if (!windowHasHTMLDialogElement()) {
      dialogPolyfill.registerDialog(this.$refs.mobileMenu as HTMLDialogElement);
    }
    this.userName = userStore.userName;
    this.currentPath = window.location.pathname;
    window.addEventListener('popstate', this.updateCurrentPath);
    this.unsubscribe = userStore.subscribe((state) => {
      this.userName = state.userName;
    });
  },
  watch: {
    mobileMenuOpen(val: boolean) {
      const dialog = this.$refs.mobileMenu as HTMLDialogElement;
      if (val && !dialog.open) {
        showModal(dialog);
      }
      if (!val && dialog.open) {
        dialog.close();
      }
      document.body.style.overflow = val ? 'hidden' : '';
    },
  },
  beforeUnmount() {
    document.body.style.overflow = '';
    window.removeEventListener('popstate', this.updateCurrentPath);
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  },
  methods: {
    navigate(path: string) {
      if (window.location.pathname !== path) {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    },
    navigateMobile(path: string) {
      this.mobileMenuOpen = false;
      this.navigate(path);
    },
    goBack() {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    },
    isActive(path: string): boolean {
      if (path === '/') {
        return this.currentPath === '/' || this.currentPath === '';
      }
      return this.currentPath.startsWith(path);
    },
    toggleMobileMenu() {
      this.mobileMenuOpen = !this.mobileMenuOpen;
    },
    updateCurrentPath() {
      this.currentPath = window.location.pathname;
      this.mobileMenuOpen = false;
    },
  },
});
</script>

<style scoped>
.tfm-navbar-wrapper {
  font-family: Ubuntu, "PingFang SC", "Microsoft YaHei", sans-serif;
  position: sticky;
  top: 0;
  z-index: 100;
}

.tfm-navbar {
  background: rgba(10,14,26,.84);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(164,185,213,.12);
}

.tfm-navbar__inner {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 76px;
  gap: 24px;
}

.tfm-navbar__left, .tfm-navbar__right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.tfm-navbar__back, .tfm-navbar__hamburger, .tfm-navbar__modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(164,185,213,.15);
  background: transparent;
  color: #a6b3c7;
  cursor: pointer;
  transition: background .2s, color .2s, transform .2s;
}

.tfm-navbar__back:hover, .tfm-navbar__hamburger:hover, .tfm-navbar__modal-close:hover {
  background: rgba(255,255,255,.07);
  color: #f1f5f9;
}

.tfm-navbar__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  cursor: pointer;
}

.tfm-navbar__brand-text {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: .14em;
  color: #f1f5f9;
}

.tfm-navbar__brand-orbit {
  display: inline-block;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: #ed7840;
  position: relative;
}

.tfm-navbar__brand-orbit::after {
  content: '';
  position: absolute;
  inset: 4px -5px;
  border: 1px solid #f5b187;
  border-radius: 50%;
  transform: rotate(-35deg);
}

.tfm-navbar__links {
  display: flex;
  align-items: center;
  gap: 5px;
}

.tfm-navbar__link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 9px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  color: #a6b3c7;
  transition: background .2s, color .2s;
  white-space: nowrap;
  cursor: pointer;
}

.tfm-navbar__link:hover {
  color: #f1f5f9;
  background: rgba(255,255,255,.05);
}

.tfm-navbar__link--active {
  color: #f5a67c;
  background: rgba(244,129,70,.1);
}

.tfm-navbar__link-icon {
  display: inline-flex;
  opacity: .8;
}

.tfm-navbar__user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 12px 5px 5px;
  border: 1px solid rgba(164,185,213,.16);
  border-radius: 24px;
  text-decoration: none;
  transition: background .2s;
}

.tfm-navbar__user:hover {
  background: rgba(255,255,255,.06);
}

.tfm-navbar__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #75432e;
  color: #ffdeca;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.tfm-navbar__username {
  color: #cbd5e1;
  font-size: 13px;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tfm-navbar__login, .tfm-navbar__modal-signin {
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: #efb694;
  text-decoration: none;
  border: 1px solid rgba(244,129,70,.28);
  border-radius: 9px;
  transition: background .2s;
  cursor: pointer;
}

.tfm-navbar__login:hover, .tfm-navbar__modal-signin:hover {
  background: rgba(244,129,70,.1);
  color: #ffd0af;
}

.tfm-navbar__hamburger {
  display: none;
  flex-direction: column;
  gap: 4px;
}

.tfm-navbar__hamburger span {
  width: 16px;
  height: 1px;
  background: currentColor;
}

.tfm-navbar__overlay {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 20px;
  border: 0;
  background: transparent;
  color: #f1f5f9;
}

.tfm-navbar__overlay[open] {
  display: flex;
  align-items: center;
  justify-content: center;
}

.tfm-navbar__overlay::backdrop {
  background: rgba(4,8,15,.7);
  backdrop-filter: blur(10px);
}

.tfm-navbar__modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 380px;
  max-height: calc(100dvh - 40px);
  border: 1px solid rgba(164,185,213,.2);
  border-radius: 20px;
  background: #121b2b;
  box-shadow: 0 24px 80px rgba(0,0,0,.4);
  overflow: hidden;
  animation: navigation-enter .25s ease-out;
}

.tfm-navbar__modal-header, .tfm-navbar__modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  flex-shrink: 0;
}

.tfm-navbar__modal-header {
  border-bottom: 1px solid rgba(164,185,213,.12);
}

.tfm-navbar__modal-footer {
  border-top: 1px solid rgba(164,185,213,.12);
}

.tfm-navbar__modal-links {
  padding: 12px;
  overflow-y: auto;
  min-height: 0;
}

.tfm-navbar__modal-link {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 10px;
  color: #a6b3c7;
  font-size: 15px;
  text-decoration: none;
  cursor: pointer;
  transition: background .2s;
}

.tfm-navbar__modal-link:hover {
  background: rgba(255,255,255,.04);
  color: #f1f5f9;
}

.tfm-navbar__modal-link--active {
  background: rgba(244,129,70,.1);
  color: #f5a67c;
}

.tfm-navbar__modal-link-icon {
  display: inline-flex;
}

.tfm-navbar__modal-user {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  color: #f1f5f9;
  text-decoration: none;
}

.tfm-navbar__modal-user-name {
  overflow-wrap: anywhere;
}

.tfm-navbar__modal-signin {
  width: 100%;
  text-align: center;
}

a:focus-visible, button:focus-visible {
  outline: 2px solid #f48146;
  outline-offset: 3px;
}

a:active, button:active {
  transform: translateY(1px);
}

@keyframes navigation-enter {
  from {
    opacity: 0;
    transform: translateY(10px) scale(.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (max-width: 960px) {
  .tfm-navbar__inner {
    padding: 0 20px;
    gap: 12px;
  }
  .tfm-navbar__link {
    padding: 10px;
  }
  .tfm-navbar__username {
    display: none;
  }
  .tfm-navbar__user {
    padding: 4px;
  }
}

@media (max-width: 760px) {
  .tfm-navbar__inner {
    height: 64px;
    padding: 0 16px;
  }
  .tfm-navbar__links {
    display: none;
  }
  .tfm-navbar__hamburger {
    display: flex;
  }
  .tfm-navbar__left, .tfm-navbar__right {
    gap: 10px;
  }
  .tfm-navbar__brand-text {
    font-size: 16px;
  }
  .tfm-navbar__brand-orbit {
    width: 14px;
    height: 14px;
  }
  .tfm-navbar__login {
    padding: 9px 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tfm-navbar__modal {
    animation: none;
  }
  a, button {
    transition: none;
  }
}
</style>
