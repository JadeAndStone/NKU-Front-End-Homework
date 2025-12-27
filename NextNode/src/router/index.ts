import { createRouter, createWebHistory } from 'vue-router'
import DocumentView from '@/views/DocumentView.vue'
// 1. 引入欢迎页
import WelcomeView from '@/views/WelcomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      // 2. ✅ 修复：不再重定向，而是直接渲染欢迎页
      component: WelcomeView
    },
    {
      path: '/page/:id',
      name: 'page',
      component: DocumentView
    }
  ]
})

export default router