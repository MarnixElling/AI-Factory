<script setup lang="ts">
const { state, trigger } = useInteractions({
  'hero-cta': { click: [{ type: 'toggle', key: 'welcome' }] },
});
</script>

<template>
  <main class="mx-auto max-w-3xl p-8">
    <h1 class="text-3xl font-bold text-ink">Prototype</h1>
    <AppButton class="mt-6" @click="trigger('hero-cta', 'click')">Toggle</AppButton>
    <p v-if="state.welcome" class="mt-4 text-ink-muted">Hello from the core layer.</p>
  </main>
</template>
