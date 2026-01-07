import { createApp } from 'vue'
import { createPinia } from 'pinia' // 队友需要的
import App from './App.vue'
import router from './router' // 队友需要的

// ✅ 你原来的样式不能丢
import './assets/main.css'
import 'highlight.js/styles/github-dark.css'

// Ensure saved theme is applied as early as possible so initial render matches user's choice
try {
  const saved = localStorage.getItem('darkMode')
  if (saved === 'true') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
} catch (err) {
  // ignore if localStorage not available
}

const app = createApp(App)

app.use(createPinia()) // 启用 Pinia
app.use(router)      // 启用路由

app.mount('#app')