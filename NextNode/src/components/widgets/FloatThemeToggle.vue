<!-- components/FloatThemeToggle.vue -->
<template>
  <button
    class="float-theme-toggle"
    type="button"
    @click="toggleTheme"
    :title="theme === 'dark' ? '切换到白天' : '切换到夜间'"
    :aria-pressed="theme === 'dark'"
  >
    <span v-if="theme === 'dark'">🌙</span>
    <span v-else>☀️</span>
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const theme = ref<'light' | 'dark'>('light')

function applyTheme(t: 'light' | 'dark') {
  theme.value = t
  const html = document.documentElement
  if (t === 'dark') {
    html.setAttribute('data-theme', 'dark')
    html.classList.add('dark')
    html.style.setProperty('--app-bg', '#0f172a')
    html.style.setProperty('--card-bg', '#0b1220')
    html.style.setProperty('--text-color', '#e6eef8')
    html.style.setProperty('--sidebar-bg', '#071029')
    html.style.setProperty('--sidebar-text', '#dbeafe')
    html.style.setProperty('--muted-color', '#9aa6b2')

    /* 编辑器暗色变量 */
    html.style.setProperty('--editor-bg', '#071225')
    html.style.setProperty('--editor-text', '#e6eef8')
    html.style.setProperty('--editor-border', '#122033')
    html.style.setProperty('--editor-placeholder', '#9aa6b2')
  } else {
    html.setAttribute('data-theme', 'light')
    html.classList.remove('dark')
    html.style.setProperty('--app-bg', '#f8fafc')
    html.style.setProperty('--card-bg', '#ffffff')
    html.style.setProperty('--text-color', '#111827')
    html.style.setProperty('--sidebar-bg', '#f1f5f9')
    html.style.setProperty('--sidebar-text', '#0f172a')
    html.style.setProperty('--muted-color', '#666666')

    /* 编辑器亮色变量 */
    html.style.setProperty('--editor-bg', '#ffffff')
    html.style.setProperty('--editor-text', '#0f172a')
    html.style.setProperty('--editor-border', '#e5e7eb')
    html.style.setProperty('--editor-placeholder', '#9ca3af')
  }
  localStorage.setItem('site-theme', t)
}

function toggleTheme() {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
}

onMounted(() => {
  const saved = (localStorage.getItem('site-theme') as 'light' | 'dark' | null)
    || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  applyTheme(saved as 'light' | 'dark')
})
</script>

<style scoped>
.float-theme-toggle {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 9999; /* 提高层级，防止被遮挡 */
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: 1px solid rgba(16,24,40,0.06);
  background: var(--card-bg, #fff);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: transform 0.18s ease, background-color 0.18s ease, color 0.18s ease;
  color: var(--text-color, #111827);
  backdrop-filter: blur(6px);
}

.float-theme-toggle:hover {
  transform: translateY(-2px);
}

.float-theme-toggle:focus {
  outline: 2px solid rgba(59,130,246,0.6);
  outline-offset: 2px;
}
</style>