<template>
  <div id="app">
    <a href="http://zondax.ch">
      <img
        alt="Vue logo"
        src="./assets/logo.png"
        width="300"
      >
    </a>
    <h1>Harmony - Ledger Javascript Integration</h1>
    <HarmonyLedger msg="Harmony+Ledger WebUSB example" />
    <h2>1) Use the latest ledger Nano S firmware from https://github.com/harmony-one/ledger-app-one</h2>
    <h2>2) turn off https certificate checking for localhost </h2>
  </div>
</template>

<script>
import HarmonyLedger from './components/HarmonyLedger.vue';

export default {
    name: 'App',
    components: {
        HarmonyLedger,
    },
};
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
