<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h2 class="sidebar-title">NextNote</h2>
      <button
        @click="createNewDocument"
        class="new-document-btn"
        title="新建文档"
      >
        + 新建文档
      </button>
    </div>
    <div class="sidebar-title-divider"></div> <!-- 新增分割线 -->
    
    <div class="sidebar-content">
      <div v-if="treeStore.tree.length === 0" class="empty-state">
        <p class="text-gray-500 text-sm">还没有文档</p>
      </div>
      
      <div v-else class="document-tree">
        <TreeNode
          v-for="node in treeStore.tree"
          :key="node.id"
          :node="node"
          :level="0"
          @open="openPage"
          @create-child="createChildPage"
          @delete="deletePage"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTreeStore } from '@/stores/tree'
import { useDocumentStore } from '@/stores/document'
import TreeNode from './TreeNode.vue'
import { blockDB } from '@/utils/idb'
import { generateId } from '@/utils/id'
import { BlockType } from '@/types'

const router = useRouter()
const treeStore = useTreeStore()
const documentStore = useDocumentStore()

// 确保树数据已加载
onMounted(async () => {
  if (treeStore.pages.size === 0) {
    await treeStore.loadAllPages()
  }
})

async function createNewDocument() {
  try {
    // 使用 documentStore.createDocument 创建页面和默认 Block
    const page = await documentStore.createDocument('未命名文档')
    console.log('创建文档成功，pageId:', page.id)
    
    // 更新树（确保新页面在树中）
    await treeStore.loadAllPages()
    console.log('树已更新，pages数量:', treeStore.pages.size)
    
    // 验证页面是否在树中
    const pageInTree = treeStore.getPage(page.id)
    if (!pageInTree) {
      console.error('页面创建后未在树中找到，重新加载树')
      await treeStore.loadAllPages()
    }
    
    // 打开新创建的文档
    await router.push({ name: 'page', params: { id: page.id } })
  } catch (error) {
    console.error('创建文档失败:', error)
    alert('创建文档失败: ' + (error as Error).message)
  }
}

async function createChildPage(parentId: string) {
  try {
    // 使用 treeStore.createPage 创建子页面
    const page = await treeStore.createPage('子文档', parentId)
    
    // 创建默认 Block
    const now = Date.now()
    const defaultBlock = {
      id: generateId(),
      type: BlockType.PARAGRAPH,
      content: { type: 'doc' as 'doc', content: [] as Array<any> },
      parentId: null,
      childrenIds: [] as string[],
      order: 0,
      createdAt: now,
      updatedAt: now,
    }
    await blockDB.save({ ...defaultBlock, pageId: page.id })
    
    // 重新加载树
    await treeStore.loadAllPages()
    
    // 打开新创建的文档
    router.push({ name: 'page', params: { id: page.id } })
  } catch (error) {
    console.error('创建子文档失败:', error)
    alert('创建子文档失败: ' + (error as Error).message)
  }
}

async function openPage(pageId: string) {
  console.log('Sidebar: 打开页面', pageId)
  try {
    await router.push({ name: 'page', params: { id: pageId } })
    console.log('Sidebar: 路由跳转完成', pageId)
  } catch (error) {
    console.error('Sidebar: 路由跳转失败', error)
  }
}

async function deletePage(pageId: string) {
  try {
    // 删除页面（会递归删除所有子页面和 Blocks）
    await treeStore.deletePage(pageId)
    
    // 重新加载树
    await treeStore.loadAllPages()
    
    // 如果当前正在查看被删除的页面，跳转到首页
    if (documentStore.currentPage?.id === pageId) {
      router.push({ name: 'home' })
    }
  } catch (error) {
    console.error('删除文档失败:', error)
    alert('删除文档失败: ' + (error as Error).message)
  }
}
</script>

<style scoped>
.sidebar {
  width: 35%;
  height: 100vh;
  background: #f7f6f3;
  border-right: 1px solid #e1e1e1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 16px 20px 16px 43px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--sidebar-text);
  margin: 0;
}

.new-document-btn {
  padding: 4px 8px;
  background: #2eaadc;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.new-document-btn:hover {
  background: #1e8db8;
}

.sidebar-title-divider {
  height: 1px;
  background: #e1e1e1;
  margin: 0 0 8px 0;
  width: 100%;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.empty-state {
  padding: 24px 16px;
  text-align: center;
}

.document-tree {
  padding: 0;
}
</style>

