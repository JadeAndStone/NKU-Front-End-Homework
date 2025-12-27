/**
 * 文档树 Store
 * 管理侧边栏的文档树结构
 * 
 * 设计要点：
 * 1. 扁平化存储所有页面（PageMap）
 * 2. 提供树形结构的计算属性
 * 3. 支持文件夹的展开/折叠状态
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PageMetadata, PageMap, TreeNode } from '@/types'
import { pageDB } from '@/utils/idb'
import { generateId } from '@/utils/id'
import { toRaw } from 'vue'

export const useTreeStore = defineStore('tree', () => {
  // 扁平化的页面存储
  const pages = ref<PageMap>(new Map())
  
  // 展开的文件夹 ID 集合
  const expandedIds = ref<Set<string>>(new Set())

  /**
   * 构建树形结构
   */
  const tree = computed<TreeNode[]>(() => {
    const pageMap = pages.value
    const rootPages: TreeNode[] = []

    // 创建所有节点的映射
    const nodeMap = new Map<string, TreeNode>()
    
    // 第一遍：创建所有节点
    for (const page of pageMap.values()) {
      nodeMap.set(page.id, {
        id: page.id,
        title: page.title,
        emoji: page.emoji,
        icon: page.icon,
        children: [],
        metadata: page,
      })
    }

    // 第二遍：构建父子关系
    for (const page of pageMap.values()) {
      const node = nodeMap.get(page.id)!
      
      if (page.parentId === null) {
        // 根节点
        rootPages.push(node)
      } else {
        // 子节点
        const parent = nodeMap.get(page.parentId)
        if (parent) {
          parent.children.push(node)
        }
      }
    }

    // 排序：按 order 排序
    const sortNodes = (nodes: TreeNode[]): void => {
      nodes.sort((a, b) => a.metadata.order - b.metadata.order)
      nodes.forEach(node => sortNodes(node.children))
    }
    
    sortNodes(rootPages)
    return rootPages
  })

  /**
   * 加载所有页面
   */
  async function loadAllPages(): Promise<void> {
    const pageMap = await pageDB.getAll()
    // 使用新的 Map 实例确保响应式更新
    pages.value = new Map(pageMap)
  }

  /**
   * 创建新页面
   */
  async function createPage(
    title: string,
    parentId: string | null = null
  ): Promise<PageMetadata> {
    const now = Date.now()
    const pageId = generateId()

    // 计算 order
    const siblings = await pageDB.getByParent(parentId)
    const order = siblings.length

    const page: PageMetadata = {
      id: pageId,
      title,
      createdAt: now,
      updatedAt: now,
      parentId,
      childrenIds: [],
      order,
    }

    // 更新父页面的 childrenIds
    let updatedParent: PageMetadata | null = null
    if (parentId) {
      const parent = pages.value.get(parentId)
      if (parent) {
        // 创建新的 childrenIds 数组（确保响应式更新）
        updatedParent = {
          ...parent,
          childrenIds: [...parent.childrenIds, pageId],
          updatedAt: Date.now()
        }
        await pageDB.save(updatedParent)
      } else {
        // 如果本地没有，从数据库加载
        const parentFromDB = await pageDB.get(parentId)
        if (parentFromDB) {
          updatedParent = {
            ...parentFromDB,
            childrenIds: [...parentFromDB.childrenIds, pageId],
            updatedAt: Date.now()
          }
          await pageDB.save(updatedParent)
        }
      }
    }

    await pageDB.save(page)
    
    // 一次性更新本地状态（创建新的 Map 实例确保响应式）
    const newPages = new Map(pages.value)
    newPages.set(pageId, page)
    if (updatedParent) {
      newPages.set(parentId!, updatedParent)
    }
    pages.value = newPages

    return page
  }

  /**
   * 更新页面
   */
  async function updatePage(
    pageId: string,
    updates: Partial<Omit<PageMetadata, 'id' | 'createdAt'>>
  ): Promise<void> {
    const page = pages.value.get(pageId)
    if (!page) return

  // ✅ 修复：先转为普通对象
    const rawPage = toRaw(page)

    const updated: PageMetadata = {
      ...rawPage,
      ...updates,
      childrenIds: [...rawPage.childrenIds], // 确保数组也是纯的
      updatedAt: Date.now(),
    }

    await pageDB.save(updated)
    // 更新本地状态（创建新的 Map 实例确保响应式）
    const newPages = new Map(pages.value)
    newPages.set(pageId, updated)
    pages.value = newPages
  }

  /**
   * 删除页面（递归删除子页面）
   */
  async function deletePage(pageId: string): Promise<void> {
    const page = pages.value.get(pageId)
    if (!page) return

    // 递归删除子页面
    for (const childId of page.childrenIds) {
      await deletePage(childId)
    }

    // 从父页面的 childrenIds 中移除
    if (page.parentId) {
      const parent = pages.value.get(page.parentId)
      if (parent) {
        const updatedParent = {
          ...parent,
          childrenIds: parent.childrenIds.filter(id => id !== pageId),
          updatedAt: Date.now()
        }
        await pageDB.save(updatedParent)
        
        // 更新本地状态
        const newPages = new Map(pages.value)
        newPages.set(page.parentId, updatedParent)
        pages.value = newPages
      }
    }

    // 删除该页面的所有 Blocks
    const { blockDB } = await import('@/utils/idb')
    await blockDB.deleteByPage(pageId)

    // 从数据库删除页面
    await pageDB.delete(pageId)
    
    // 从本地状态删除（创建新的 Map 实例确保响应式）
    const newPages = new Map(pages.value)
    newPages.delete(pageId)
    pages.value = newPages
  }

  /**
   * 移动页面
   */
  async function movePage(
    pageId: string,
    newParentId: string | null,
    newOrder: number
  ): Promise<void> {
    const page = pages.value.get(pageId)
    if (!page) return

    // 从旧父节点移除
    if (page.parentId) {
      const oldParent = pages.value.get(page.parentId)
      if (oldParent) {
        oldParent.childrenIds = oldParent.childrenIds.filter(id => id !== pageId)
        await pageDB.save(oldParent)
      }
    }

    // 添加到新父节点
    if (newParentId) {
      const newParent = pages.value.get(newParentId)
      if (newParent) {
        newParent.childrenIds.splice(newOrder, 0, pageId)
        await pageDB.save(newParent)
      }
    }

    // 更新页面
    page.parentId = newParentId
    page.order = newOrder
    await pageDB.save(page)
    pages.value.set(pageId, page)
  }

  /**
   * 切换文件夹展开/折叠
   */
  function toggleExpand(pageId: string): void {
    if (expandedIds.value.has(pageId)) {
      expandedIds.value.delete(pageId)
    } else {
      expandedIds.value.add(pageId)
    }
  }

  /**
   * 检查文件夹是否展开
   */
  function isExpanded(pageId: string): boolean {
    return expandedIds.value.has(pageId)
  }

  /**
   * 展开所有文件夹
   */
  function expandAll(): void {
    for (const page of pages.value.values()) {
      if (page.childrenIds.length > 0) {
        expandedIds.value.add(page.id)
      }
    }
  }

  /**
   * 折叠所有文件夹
   */
  function collapseAll(): void {
    expandedIds.value.clear()
  }

  /**
   * 根据 ID 获取页面
   */
  function getPage(pageId: string): PageMetadata | undefined {
    return pages.value.get(pageId)
  }

  return {
    // State
    pages,
    expandedIds,
    
    // Computed
    tree,
    
    // Actions
    loadAllPages,
    createPage,
    updatePage,
    deletePage,
    movePage,
    toggleExpand,
    isExpanded,
    expandAll,
    collapseAll,
    getPage,
  }
})

