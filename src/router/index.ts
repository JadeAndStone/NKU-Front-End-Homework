/**
 * Vue Router 配置
 * 
 * 路由设计：
 * - / : 首页（显示文档列表或默认文档）
 * - /page/:id : 打开指定 ID 的文档
 * 
 * 路由守卫：
 * - 如果访问的页面不存在，自动创建或重定向到首页
 */

import { createRouter, createWebHistory } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { useTreeStore } from '@/stores/tree'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      beforeEnter: async () => {
        const treeStore = useTreeStore()
        await treeStore.loadAllPages()
      },
    },
    {
      path: '/page/:id',
      name: 'page',
      component: () => import('@/views/PageView.vue'),
      // 注意：beforeEnter 只在首次进入路由时执行
      // 如果是从一个 page 切换到另一个 page，beforeEnter 不会执行
      // 所以文档加载逻辑统一在 beforeEach 中处理，确保所有情况都能正确加载
    },
  ],
})

// 全局前置守卫：切换路由时清理文档状态并加载文档
router.beforeEach(async (to, from) => {
  console.log('beforeEach: 路由切换', { from: from.name, to: to.name, toId: to.params.id })
  const documentStore = useDocumentStore()
  const treeStore = useTreeStore()
  
  // 如果切换到 page 路由
  if (to.name === 'page') {
    const pageId = to.params.id as string
    
    // 如果从其他路由跳转到 page，或切换到不同的 page
    if (from.name !== 'page' || from.params.id !== pageId) {
      console.log('beforeEach: 需要加载页面', pageId)
      
      // 清空旧文档状态
      if (from.name === 'page' && from.params.id !== pageId) {
        console.log('beforeEach: 切换到不同页面，清空旧文档')
        documentStore.clearDocument()
      }
      
      // 加载新文档（这里处理 beforeEnter 的逻辑）
      try {
        // 确保树已加载
        await treeStore.loadAllPages()
        console.log('beforeEach: 树已加载，pages数量:', treeStore.pages.size)

        // 检查页面是否存在
        let page = treeStore.getPage(pageId)
        if (!page) {
          // 如果树中找不到，从数据库查找
          const { pageDB } = await import('@/utils/idb')
          const pageFromDB = await pageDB.get(pageId)
          if (pageFromDB) {
            await treeStore.loadAllPages()
            page = treeStore.getPage(pageId)
          }
        }

        if (!page) {
          console.warn(`beforeEach: Page ${pageId} not found, redirecting to home`)
          return { name: 'home' }
        }

        // 加载文档
        console.log('beforeEach: 开始加载文档', pageId)
        await documentStore.loadDocument(pageId)
        console.log('beforeEach: 文档加载成功', pageId, 'currentPage:', documentStore.currentPage?.id)
      } catch (error) {
        console.error('beforeEach: Failed to load document:', error)
        return { name: 'home' }
      }
    }
  }
  // 如果从页面路由切换到其他路由，清理文档状态
  else if (from.name === 'page' && to.name !== 'page') {
    console.log('beforeEach: 从 page 切换到其他路由，清空文档')
    documentStore.clearDocument()
  }
  
  console.log('beforeEach: 完成，currentPage:', documentStore.currentPage?.id || 'null')
})

export default router

