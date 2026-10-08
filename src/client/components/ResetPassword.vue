<template>
  <div class="auth-page portal-page">
    <div class="auth-page__inner portal-enter">
      <a href="/" class="auth-brand">
        <span class="auth-brand__mark" aria-hidden="true">TM</span>
        <span v-i18n>Terraforming Mars</span>
      </a>
      <section class="auth-card portal-panel" aria-labelledby="reset-password-title">
        <div class="auth-card__header">
          <h1 id="reset-password-title" class="auth-card__title" v-i18n>Reset Password</h1>
        </div>
        <div v-if="isTokenError" class="auth-feedback auth-feedback--error" aria-live="polite">
          {{ $t(tokenErrorMessage) }}
        </div>
        <div class="auth-form">
          <div class="auth-field">
            <label for="reset-username" class="auth-label" v-i18n>Username</label>
            <input id="reset-username" name="username" autocomplete="username" readonly class="auth-input" v-model="userName" />
          </div>
          <div class="auth-field">
            <label for="reset-password" class="auth-label" v-i18n>Password</label>
            <input id="reset-password" name="password" autocomplete="new-password" type="password" class="auth-input" :placeholder="$t('New Password')" v-model="password" />
          </div>
          <div class="auth-field">
            <label for="reset-confirm-password" class="auth-label" v-i18n>Confirm Password</label>
            <input id="reset-confirm-password" name="confirm-password" autocomplete="new-password" type="password" class="auth-input" :placeholder="$t('Confirm Password')" v-model="confirmPassword" />
          </div>
        </div>
        <div class="auth-actions">
          <button class="auth-primary" :disabled="isSubmitting || isTokenError" @click="resetPassword">{{ $t(isSubmitting ? 'Submitting' : 'Reset Password') }}</button>
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
import {RequestError} from '@/client/utils/request';
import {showError, showWarning} from '../utils/showAlert';
import {authService} from '../services';

function getErrorMessage(err: unknown): string {
  if (err instanceof RequestError) {
    try {
      const body = JSON.parse(err.body) as {error?: string};
      return body.error ?? err.body;
    } catch {
      return err.body;
    }
  }
  return err instanceof Error ? err.message : 'Unexpected server response';
}

function isTokenExpiredError(err: unknown): boolean {
  return getErrorMessage(err).toLowerCase().includes('expired');
}

export default defineComponent({
  name: 'ResetPassword',
  data() {
    return {
      userName: '',
      token: '',
      password: '',
      confirmPassword: '',
      isSubmitting: false,
      isTokenError: false,
      tokenErrorMessage: '',
    };
  },
  mounted() {
    const query = new URLSearchParams(window.location.search);
    this.userName = query.get('userName') ?? '';
    this.token = query.get('token') ?? '';

    if (this.userName.length > 0 && this.token.length > 0) {
      authService.checkResetToken(this.userName, this.token).catch((err) => {
        this.isTokenError = true;
        this.tokenErrorMessage = isTokenExpiredError(err) ?
          'Reset link has expired. Please request a new one.' :
          'Reset link is invalid. Please request a new one.';
      });
    }
  },
  methods: {
    async resetPassword() {
      if (this.userName.length === 0 || this.token.length === 0 || this.isTokenError) {
        showWarning('Reset link is invalid');
        return;
      }
      if (this.password.length <= 2) {
        showWarning($t('Please enter at least 3 characters for password'));
        return;
      }
      if (this.password !== this.confirmPassword) {
        showWarning('Passwords do not match');
        return;
      }

      this.isSubmitting = true;
      try {
        await authService.resetPassword(this.userName, this.token, this.password);
        window.location.href = '/login?passwordReset=success';
      } catch (err: unknown) {
        showError(getErrorMessage(err));
      } finally {
        this.isSubmitting = false;
      }
    },
  },
});
</script>
