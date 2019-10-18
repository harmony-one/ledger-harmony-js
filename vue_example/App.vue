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
    <HarmonyLedger msg="Minimal Harmony+Ledger delegation example" />
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
