<template>
  <div class="donate-page portal-page">
    <div class="donate-content portal-enter">
      <header class="donate-header">
        <div><p class="donate-eyebrow">TERRAFORMING MARS</p><h1 class="portal-heading">支援火星</h1></div>
        <a class="donate-return" href="/" @click="goJump">点此返回 <span aria-hidden="true">↗</span></a>
      </header>
      <div class="donate-layout">
        <section class="donate-membership portal-panel">
          <div class="donate-membership__title"><img src="/assets/qrcode/potato.png" alt="" /><h2>土豆专属功能</h2></div>
          <ol class="donate-features">
            <li>对局回合外回退，每天 5 次</li>
            <li>开局选项含非官方变体及玩家 DIY（界限突破、双公司等）</li>
            <li>开局频率无限制</li>
            <li>保存开局设置，一键下载上传</li>
            <li>不体面地退出游戏</li>
            <li>后续推出的其他功能</li>
          </ol>
          <a class="donate-guide" href="/help">查看功能指引 <span aria-hidden="true">→</span></a>
          <div class="donate-prices"><span><strong>30</strong> / 半年</span><span><strong>50</strong> / 一年</span><span><strong>200</strong> / 永久</span></div>
        </section>
        <section class="donate-community portal-panel">
          <h2>与火星玩家相聚</h2>
          <p>支援火星，点亮土豆专属标识。<br>请扫码添加微信，或添加 QQ：478487808。</p>
          <div class="donate-codes">
            <figure><img src="/assets/qrcode/imgwx.png" alt="微信二维码" /><figcaption>微信</figcaption></figure>
            <figure><img src="/assets/qrcode/imgqq.png" alt="QQ群二维码" /><figcaption>QQ 群</figcaption></figure>
          </div>
          <p class="donate-community__note">扫描二维码加入玩家群，一起切磋。</p>
        </section>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';

export default defineComponent({
  name: 'Donate',
  methods: {
    goJump(eve: Event) {
      const app = this.$root as any;
      if (app.oscreen !== 'empty') {
        app.screen = app.oscreen;
        app.oscreen = 'empty';
        eve.preventDefault();
      }
    },
  },
});
</script>

<style scoped>
.donate-content {
  max-width: 1080px;
  margin: 0 auto;
}

.donate-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 32px;
}

.donate-header .portal-heading {
  margin: 0;
}

.donate-eyebrow {
  color: var(--portal-accent);
  font-size: 11px;
  letter-spacing: .2em;
  margin: 0 0 12px;
}

.donate-return, .donate-guide {
  color: var(--portal-accent);
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
}

.donate-return:hover, .donate-guide:hover {
  color: #ffc8a6;
}

.donate-return:focus-visible, .donate-guide:focus-visible {
  outline: 2px solid var(--portal-accent);
  outline-offset: 4px;
}

.donate-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.donate-membership, .donate-community {
  min-width: 0;
  padding: clamp(24px, 3vw, 36px);
}

.donate-membership__title {
  display: flex;
  align-items: center;
  gap: 12px;
}

h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  filter: none;
  text-shadow: none;
}

.donate-membership__title img {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.donate-features {
  display: grid;
  gap: 16px;
  margin: 28px 0;
  padding-left: 24px;
  color: var(--portal-muted);
  font-size: 15px;
  line-height: 1.7;
}

.donate-features li {
  padding-left: 6px;
}

.donate-features li::marker {
  color: var(--portal-accent);
  font-size: 12px;
}

.donate-prices {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  padding-top: 28px;
  margin-top: 28px;
  border-top: 1px solid var(--portal-border);
  color: var(--portal-muted);
  font-size: 13px;
}

.donate-prices strong {
  font-size: 24px;
  color: var(--portal-text);
  font-weight: 500;
}

.donate-community p {
  color: var(--portal-muted);
  font-size: 14px;
  line-height: 1.8;
  margin: 18px 0 24px;
}

.donate-codes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.donate-codes figure {
  margin: 0;
  min-width: 0;
  text-align: center;
}

.donate-codes img {
  display: block;
  width: 100%;
  border-radius: 10px;
}

.donate-codes figcaption {
  margin-top: 12px;
  color: var(--portal-muted);
  font-size: 13px;
}

.donate-community .donate-community__note {
  margin-bottom: 0;
  font-size: 13px;
}

@media (max-width: 760px) {
  .donate-layout {
    grid-template-columns: 1fr;
  }
}
</style>
