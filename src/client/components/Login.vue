<template>
  <div class="auth-page portal-page">
    <div class="auth-page__inner portal-enter">
      <a href="/" class="auth-brand">
        <span class="auth-brand__mark" aria-hidden="true">TM</span>
        <span v-i18n>Terraforming Mars</span>
      </a>
      <section class="auth-card portal-panel" aria-labelledby="login-title">
        <div class="auth-card__header">
          <h1 id="login-title" class="auth-card__title" v-i18n>Login</h1>
        </div>
        <div class="auth-form">
          <div class="auth-field">
            <label for="login-username" class="auth-label" v-i18n>Username</label>
            <input id="login-username" name="username" autocomplete="username" class="auth-input" placeholder="Your Name" v-model="userName" />
          </div>
          <div class="auth-field">
            <label for="login-password" class="auth-label" v-i18n>Password</label>
            <input id="login-password" name="password" autocomplete="current-password" type="password" class="auth-input" placeholder="Password" v-model="password" />
          </div>
        </div>
        <div class="auth-actions">
          <button class="auth-primary" @click="login" v-i18n>Login</button>
          <a class="auth-secondary" href="/register" v-i18n>Register</a>
        </div>
      </section>
    </div>
  </div>
</template>

<style src="./auth-pages.css"></style>

<script lang="ts">
import {defineComponent} from 'vue';
import {showError, showSuccess, showWarning} from '../utils/showAlert';
import {authService} from '../services';
import {userStore} from '../stores';

export default defineComponent({
  name: 'Login',
  data() {
    return {
      userName: '',
      password: '',
    };
  },
  mounted() {
    const query = new URLSearchParams(window.location.search);
    if (query.get('passwordReset') === 'success') {
      showSuccess('Password reset successful. Please login.');
      window.history.replaceState(null, '', '/login');
    }
  },
  methods: {
    async login() {
      if (this.userName === undefined || this.userName.length === 0) {
        showWarning('Please enter userName');
        return;
      }
      if (this.password === undefined || this.password.length <= 1) {
        showWarning('Please enter more than 1 characters for password');
        return;
      }

      try {
        const data = await authService.login(this.userName, this.password);
        userStore.setUser(data.id, data.name);
        window.location.href = '/mygames';
      } catch (err: any) {
        showError(err.body || 'Unexpected server response');
      }
    },
  },
});
</script>
