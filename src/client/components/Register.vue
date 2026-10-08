<template>
  <div class="auth-page portal-page">
    <div class="auth-page__inner portal-enter">
      <a href="/" class="auth-brand">
        <span class="auth-brand__mark" aria-hidden="true">TM</span>
        <span v-i18n>Terraforming Mars</span>
      </a>
      <section class="auth-card portal-panel" aria-labelledby="register-title">
        <div class="auth-card__header">
          <h1 id="register-title" class="auth-card__title" v-i18n>Register</h1>
        </div>
        <div class="auth-form">
          <div class="auth-field">
            <label for="register-username" class="auth-label" v-i18n>Username</label>
            <input id="register-username" name="username" autocomplete="username" class="auth-input" placeholder="Your Name" v-model="userName" />
          </div>
          <div class="auth-field">
            <label for="register-password" class="auth-label" v-i18n>Password</label>
            <input id="register-password" name="password" autocomplete="new-password" type="password" class="auth-input" placeholder="Password" v-model="password" />
          </div>
        </div>
        <div class="auth-actions">
          <button class="auth-primary" @click="register" v-i18n>Register</button>
          <a class="auth-secondary" href="/login" v-i18n>Login</a>
        </div>
      </section>
    </div>
  </div>
</template>

<style src="./auth-pages.css"></style>

<script lang="ts">
import {defineComponent} from 'vue';
import {$t} from '@/client/directives/i18n';
import {showError, showWarning} from '../utils/showAlert';
import {authService} from '../services';

export default defineComponent({
  name: 'Register',
  data() {
    return {
      userName: '',
      password: '',
    };
  },
  methods: {
    async register() {
      if (this.userName === undefined || this.userName.length <= 1) {
        showWarning($t('Please enter at least 2 characters for userName'));
        return;
      }
      if (this.password === undefined || this.password.length <= 2) {
        showWarning($t('Please enter at least 3 characters for password'));
        return;
      }

      try {
        await authService.register(this.userName, this.password);
        window.location.href = '/login';
      } catch (err: any) {
        showError($t(err.body) || 'Unexpected server response');
      }
    },
  },
});
</script>
