/**
 * 文档 Store
 * 管理当前打开的文档及其所有 Blocks
 * 
 * 设计要点：
 * 1. 使用 shallowRef 存储巨大的 BlockMap，避免深度响应式带来的性能问题
 * 2. 提供扁平化的 Block 访问接口
 * 3. 自动同步到 IndexedDB
 */

import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import type { Block, PageMetadata, BlockMap, Document } from '@/types'
import { blockDB, pageDB } from '@/utils/idb'
import { generateId } from '@/utils/id'
import { BlockType } from '@/types'

export const useDocumentStore = defineStore('document', () => {
  // 当前打开的页面元数据
  const currentPage = ref<PageMetadata | null>(null)
  
  // 当前页面的所有 Blocks（使用 shallowRef 避免深度监听）
  const blocks = shallowRef<BlockMap>(new Map())
  
  // 根 Block ID
  const rootBlockId = ref<string | null>(null)

  /**
   * 当前文档的完整数据
   */
  const currentDocument = computed<Document | null>(() => {
    if (!currentPage.value) return null
    return {
      page: currentPage.value,
      blocks: blocks.value,
      rootBlockId: rootBlockId.value,
    }
  })

  /**
   * 加载文档
   */
  async function loadDocument(pageId: string): Promise<void> {
    console.log('loadDocument: 开始加载', pageId)
    // 加载页面元数据
    const page = await pageDB.get(pageId)
    if (!page) {
      console.error('loadDocument: 页面不存在', pageId)
      throw new Error(`Page ${pageId} not found`)
    }
    console.log('loadDocument: 页面元数据加载成功', page.id, page.title)
    currentPage.value = page
    console.log('loadDocument: currentPage 已设置', currentPage.value?.id)

    // 加载所有 Blocks
    let blockMap = await blockDB.getByPage(pageId)
    console.log('loadDocument: Blocks 加载完成，数量:', blockMap.size)
    
    // 如果没有 Block，创建默认 Block
    if (blockMap.size === 0) {
      console.log('loadDocument: 没有 Block，创建默认 Block')
      const now = Date.now()
      const defaultBlock: Block = {
        id: generateId(),
        type: BlockType.PARAGRAPH,
        content: {
          type: 'doc',
          content: [],
        },
        parentId: null,
        childrenIds: [],
        order: 0,
        createdAt: now,
        updatedAt: now,
      }
      
      // 保存到数据库
      await blockDB.save({ ...defaultBlock, pageId })
      
      // 创建新的 Map 并添加默认 Block（确保 shallowRef 能检测到变化）
      blockMap = new Map([[defaultBlock.id, defaultBlock]])
    } else {
      // 确保使用新的 Map 实例（shallowRef 需要）
      blockMap = new Map(blockMap)
    }
    
    blocks.value = blockMap
    console.log('loadDocument: blocks 已设置，数量:', blocks.value.size)

    // 找到根 Block（parentId 为 null 的第一个）
    const rootBlock = Array.from(blockMap.values()).find(
      block => block.parentId === null
    )
    rootBlockId.value = rootBlock?.id || null
    console.log('loadDocument: 加载完成', {
      currentPage: currentPage.value?.id,
      blocksCount: blocks.value.size,
      rootBlockId: rootBlockId.value
    })
  }

  /**
   * 创建新文档
   */
  async function createDocument(
    title: string,
    parentId: string | null = null
  ): Promise<PageMetadata> {
    const now = Date.now()
    const pageId = generateId()
    
    const page: PageMetadata = {
      id: pageId,
      title,
      createdAt: now,
      updatedAt: now,
      parentId,
      childrenIds: [],
      order: 0,
    }

    // 创建默认的段落 Block
    const defaultBlock: Block = {
      id: generateId(),
      type: BlockType.PARAGRAPH,
      content: {
        type: 'doc',
        content: [],
      },
      parentId: null,
      childrenIds: [],
      order: 0,
      createdAt: now,
      updatedAt: now,
    }

    // 保存到数据库
    await pageDB.save(page)
    await blockDB.save({ ...defaultBlock, pageId })

    // 注意：不要在这里设置 currentPage，让路由守卫和 beforeEnter 来处理
    // 这样可以避免状态不一致的问题
    // currentPage.value = page
    // blocks.value = new Map([[defaultBlock.id, defaultBlock]])
    // rootBlockId.value = defaultBlock.id

    // 如果 parentId 不为 null，更新父页面的 childrenIds
    if (parentId) {
      const parentPage = await pageDB.get(parentId)
      if (parentPage) {
        parentPage.childrenIds.push(pageId)
        await pageDB.save(parentPage)
      }
    }

    return page
  }

  /**
   * 更新页面元数据
   */
  async function updatePageMetadata(
    updates: Partial<Omit<PageMetadata, 'id' | 'createdAt'>>
  ): Promise<void> {
    if (!currentPage.value) return

    const updated: PageMetadata = {
      ...currentPage.value,
      ...updates,
      updatedAt: Date.now(),
    }

    await pageDB.save(updated)
    currentPage.value = updated
  }

  /**
   * 获取 Block
   */
  function getBlock(blockId: string): Block | undefined {
    return blocks.value.get(blockId)
  }

  /**
   * 获取子 Blocks
   */
  function getChildBlocks(blockId: string): Block[] {
    const block = blocks.value.get(blockId)
    if (!block) return []
    
    return block.childrenIds
      .map(id => blocks.value.get(id))
      .filter((b): b is Block => b !== undefined)
      .sort((a, b) => a.order - b.order)
  }

  /**
   * 添加 Block
   */
  async function addBlock(
    type: BlockType,
    parentId: string | null = null,
    afterBlockId?: string
  ): Promise<Block> {
    if (!currentPage.value) {
      throw new Error('No document loaded')
    }

    const now = Date.now()
    const blockId = generateId()

    // 创建默认内容
    let content: Block['content']
    switch (type) {
      case BlockType.PARAGRAPH:
      case BlockType.HEADING_1:
      case BlockType.HEADING_2:
      case BlockType.HEADING_3:
        content = { type: 'doc', content: [] }
        break
      case BlockType.CODE:
        content = { language: 'javascript', code: '' }
        break
      case BlockType.CALENDAR:
        content = { events: [], viewMode: 'month' }
        break
      default:
        content = { type: 'doc', content: [] }
    }

    // 计算 order
    let order = 0
    if (parentId) {
      const parent = blocks.value.get(parentId)
      if (parent) {
        if (afterBlockId) {
          const afterBlock = blocks.value.get(afterBlockId)
          order = afterBlock ? afterBlock.order + 1 : parent.childrenIds.length
        } else {
          order = parent.childrenIds.length
        }
      }
    } else {
      // 根级别
      if (afterBlockId) {
        const afterBlock = blocks.value.get(afterBlockId)
        order = afterBlock ? afterBlock.order + 1 : blocks.value.size
      } else {
        order = blocks.value.size
      }
    }

    const block: Block = {
      id: blockId,
      type,
      content,
      parentId,
      childrenIds: [],
      order,
      createdAt: now,
      updatedAt: now,
    }

    // 保存到数据库
    await blockDB.save({ ...block, pageId: currentPage.value.id })

    // 更新父 Block 的 childrenIds（如果有）
    let updatedParent: Block | null = null
    if (parentId) {
      const parent = blocks.value.get(parentId)
      if (parent) {
        const newChildrenIds = [...parent.childrenIds]
        if (afterBlockId) {
          const index = newChildrenIds.indexOf(afterBlockId)
          newChildrenIds.splice(index + 1, 0, blockId)
        } else {
          newChildrenIds.push(blockId)
        }
        updatedParent = { ...parent, childrenIds: newChildrenIds }
        await blockDB.save({ ...updatedParent, pageId: currentPage.value.id })
      }
    }
    
    // 一次性更新本地状态（包含新 Block 和更新的父 Block）
    const newBlocks = new Map(blocks.value)
    newBlocks.set(blockId, block)
    if (updatedParent) {
      newBlocks.set(parentId, updatedParent)
    }
    blocks.value = newBlocks

    return block
  }

  /**
   * 更新 Block
   */
  async function updateBlock(
    blockId: string,
    updates: Partial<Omit<Block, 'id' | 'createdAt'>>
  ): Promise<void> {
    if (!currentPage.value) return

    const block = blocks.value.get(blockId)
    if (!block) return

    const updated: Block = {
      ...block,
      ...updates,
      updatedAt: Date.now(),
    }

    await blockDB.save({ ...updated, pageId: currentPage.value.id })
    
    // 更新本地状态（shallowRef 需要重新赋值来触发响应式）
    const newBlocks = new Map(blocks.value)
    newBlocks.set(blockId, updated)
    blocks.value = newBlocks
  }

  /**
   * 删除 Block（递归删除子 Blocks）
   */
  async function deleteBlock(blockId: string): Promise<void> {
    if (!currentPage.value) return

    const block = blocks.value.get(blockId)
    if (!block) return

    // 收集所有要删除的 Block ID（包括子 Block）
    const idsToDelete = new Set<string>()
    
    function collectIds(id: string) {
      idsToDelete.add(id)
      const b = blocks.value.get(id)
      if (b) {
        b.childrenIds.forEach(childId => collectIds(childId))
      }
    }
    collectIds(blockId)

    // 从数据库删除所有 Block
    for (const id of idsToDelete) {
      await blockDB.delete(id)
    }

    // 更新父 Block（如果有）
    if (block.parentId) {
      const parent = blocks.value.get(block.parentId)
      if (parent) {
        const updatedParent = {
          ...parent,
          childrenIds: parent.childrenIds.filter(id => id !== blockId)
        }
        await blockDB.save({ ...updatedParent, pageId: currentPage.value.id })
      }
    }

    // 一次性更新本地状态：删除所有 Block 并更新父 Block
    const newBlocks = new Map(blocks.value)
    for (const id of idsToDelete) {
      newBlocks.delete(id)
    }
    if (block.parentId) {
      const parent = blocks.value.get(block.parentId)
      if (parent) {
        newBlocks.set(block.parentId, {
          ...parent,
          childrenIds: parent.childrenIds.filter(id => id !== blockId)
        })
      }
    }
    blocks.value = newBlocks
    
    // 如果删除的是根 Block，或所有 Block 都被删除，更新 rootBlockId
    if (rootBlockId.value === blockId || idsToDelete.has(rootBlockId.value || '')) {
      const newRootBlock = Array.from(newBlocks.values()).find(
        b => b.parentId === null
      )
      rootBlockId.value = newRootBlock?.id || null
    }

    // 如果所有 Block 都被删除，创建一个默认 Block
    if (newBlocks.size === 0) {
      const now = Date.now()
      const defaultBlock: Block = {
        id: generateId(),
        type: BlockType.PARAGRAPH,
        content: { type: 'doc', content: [] },
        parentId: null,
        childrenIds: [],
        order: 0,
        createdAt: now,
        updatedAt: now,
      }
      await blockDB.save({ ...defaultBlock, pageId: currentPage.value.id })
      blocks.value = new Map([[defaultBlock.id, defaultBlock]])
      rootBlockId.value = defaultBlock.id
    }
  }

  /**
   * 移动 Block
   */
  async function moveBlock(
    blockId: string,
    newParentId: string | null,
    newOrder: number
  ): Promise<void> {
    if (!currentPage.value) return

    const block = blocks.value.get(blockId)
    if (!block) return

    // 从旧父节点移除
    if (block.parentId) {
      const oldParent = blocks.value.get(block.parentId)
      if (oldParent) {
        const updatedOldParent = {
          ...oldParent,
          childrenIds: oldParent.childrenIds.filter(id => id !== blockId)
        }
        await blockDB.save({ ...updatedOldParent, pageId: currentPage.value.id })
        
        // 更新本地状态
        const newBlocksForOldParent = new Map(blocks.value)
        newBlocksForOldParent.set(block.parentId, updatedOldParent)
        blocks.value = newBlocksForOldParent
      }
    }

    // 添加到新父节点
    if (newParentId) {
      const newParent = blocks.value.get(newParentId)
      if (newParent) {
        const newChildrenIds = [...newParent.childrenIds]
        newChildrenIds.splice(newOrder, 0, blockId)
        const updatedNewParent = {
          ...newParent,
          childrenIds: newChildrenIds
        }
        await blockDB.save({ ...updatedNewParent, pageId: currentPage.value.id })
        
        // 更新本地状态
        const newBlocksForNewParent = new Map(blocks.value)
        newBlocksForNewParent.set(newParentId, updatedNewParent)
        blocks.value = newBlocksForNewParent
      }
    }

    // 更新 Block
    block.parentId = newParentId
    block.order = newOrder
    await blockDB.save({ ...block, pageId: currentPage.value.id })
    
    // 更新本地状态（shallowRef 需要重新赋值来触发响应式）
    const newBlocks = new Map(blocks.value)
    newBlocks.set(blockId, block)
    blocks.value = newBlocks
  }

  /**
   * 清空当前文档（用于切换文档时）
   */
  function clearDocument(): void {
    currentPage.value = null
    blocks.value = new Map()
    rootBlockId.value = null
  }

  return {
    // State
    currentPage,
    blocks,
    rootBlockId,
    
    // Computed
    currentDocument,
    
    // Actions
    loadDocument,
    createDocument,
    updatePageMetadata,
    getBlock,
    getChildBlocks,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    clearDocument,
  }
})

