/**
 * IndexedDB 封装工具
 * 
 * 为什么使用 IndexedDB：
 * 1. LocalStorage 只有 5-10MB，无法存储大量富文本和图片
 * 2. IndexedDB 可以存储 Blob/ArrayBuffer，适合存储图片
 * 3. 支持事务，保证数据一致性
 * 
 * 使用 idb 库简化 IndexedDB API
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { Block, PageMetadata, BlockMap, PageMap } from '@/types'

/**
 * 数据库 Schema 定义
 */
interface NextNoteDB extends DBSchema {
  pages: {
    key: string
    value: PageMetadata
    indexes: { 'by-parent': string | null; 'by-updated': number }
  }
  blocks: {
    key: string
    value: Block & { pageId: string }  // Block 需要包含 pageId 用于索引
    indexes: { 'by-parent': string | null; 'by-page': string }
  }
}

const DB_NAME = 'nextnote-db'
const DB_VERSION = 1

/**
 * 打开数据库连接
 */
export async function openDatabase(): Promise<IDBPDatabase<NextNoteDB>> {
  return openDB<NextNoteDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 创建 pages 表
      if (!db.objectStoreNames.contains('pages')) {
        const pageStore = db.createObjectStore('pages', { keyPath: 'id' })
        pageStore.createIndex('by-parent', 'parentId')
        pageStore.createIndex('by-updated', 'updatedAt')
      }

      // 创建 blocks 表
      if (!db.objectStoreNames.contains('blocks')) {
        const blockStore = db.createObjectStore('blocks', { keyPath: 'id' })
        blockStore.createIndex('by-parent', 'parentId')
        blockStore.createIndex('by-page', 'pageId', { unique: false })
      }
    },
  })
}

/**
 * Page 操作
 */
export const pageDB = {
  /**
   * 保存页面元数据
   */
  async save(page: PageMetadata): Promise<void> {
    const db = await openDatabase()
    await db.put('pages', page)
  },

  /**
   * 批量保存页面
   */
  async saveAll(pages: PageMetadata[]): Promise<void> {
    const db = await openDatabase()
    const tx = db.transaction('pages', 'readwrite')
    await Promise.all(pages.map(page => tx.store.put(page)))
    await tx.done
  },

  /**
   * 获取页面
   */
  async get(id: string): Promise<PageMetadata | undefined> {
    const db = await openDatabase()
    return db.get('pages', id)
  },

  /**
   * 获取所有页面
   */
  async getAll(): Promise<PageMap> {
    const db = await openDatabase()
    const pages = await db.getAll('pages')
    return new Map(pages.map(page => [page.id, page]))
  },

  /**
   * 根据父页面 ID 获取子页面
   */
  async getByParent(parentId: string | null): Promise<PageMetadata[]> {
    const db = await openDatabase()
    const index = db.transaction('pages').store.index('by-parent')
    return index.getAll(parentId)
  },

  /**
   * 删除页面
   */
  async delete(id: string): Promise<void> {
    const db = await openDatabase()
    await db.delete('pages', id)
  },

  /**
   * 清空所有页面
   */
  async clear(): Promise<void> {
    const db = await openDatabase()
    await db.clear('pages')
  },
}

/**
 * Block 操作
 * 注意：Block 需要额外存储 pageId 字段用于关联
 */
export const blockDB = {
  /**
   * 保存 Block（需要传入 pageId）
   */
  async save(block: Block & { pageId: string }): Promise<void> {
    const db = await openDatabase()
    await db.put('blocks', block as any)
  },

  /**
   * 批量保存 Blocks
   */
  async saveAll(blocks: Array<Block & { pageId: string }>): Promise<void> {
    const db = await openDatabase()
    const tx = db.transaction('blocks', 'readwrite')
    await Promise.all(blocks.map(block => tx.store.put(block as any)))
    await tx.done
  },

  /**
   * 获取 Block
   */
  async get(id: string): Promise<Block | undefined> {
    const db = await openDatabase()
    const result = await db.get('blocks', id)
    if (result) {
      // 移除 pageId（这是数据库内部字段）
      const { pageId, ...block } = result as any
      return block
    }
    return undefined
  },

  /**
   * 获取页面的所有 Blocks
   */
  async getByPage(pageId: string): Promise<BlockMap> {
    const db = await openDatabase()
    const index = db.transaction('blocks').store.index('by-page')
    const blocks = await index.getAll(pageId)
    return new Map(blocks.map(block => {
      const { pageId: _, ...blockData } = block as any
      return [blockData.id, blockData]
    }))
  },

  /**
   * 根据父 Block ID 获取子 Blocks
   */
  async getByParent(parentId: string | null, pageId: string): Promise<Block[]> {
    const db = await openDatabase()
    const index = db.transaction('blocks').store.index('by-parent')
    const blocks = await index.getAll(parentId)
    // 过滤出属于当前页面的 blocks
    return blocks
      .filter((block: any) => block.pageId === pageId)
      .map((block: any) => {
        const { pageId: _, ...blockData } = block
        return blockData
      })
  },

  /**
   * 删除 Block
   */
  async delete(id: string): Promise<void> {
    const db = await openDatabase()
    await db.delete('blocks', id)
  },

  /**
   * 删除页面的所有 Blocks
   */
  async deleteByPage(pageId: string): Promise<void> {
    const db = await openDatabase()
    const tx = db.transaction('blocks', 'readwrite')
    const store = tx.store
    const index = store.index('by-page')
    const blocks = await index.getAll(pageId)
    // 通过对象存储删除，而不是通过索引删除
    await Promise.all(blocks.map(block => store.delete(block.id)))
    await tx.done
  },

  /**
   * 清空所有 Blocks
   */
  async clear(): Promise<void> {
    const db = await openDatabase()
    await db.clear('blocks')
  },
}

/**
 * 数据库工具函数
 */
export const dbUtils = {
  /**
   * 清空整个数据库（用于开发/测试）
   */
  async clearAll(): Promise<void> {
    const db = await openDatabase()
    await db.clear('pages')
    await db.clear('blocks')
  },

  /**
   * 导出所有数据（用于备份）
   */
  async exportData(): Promise<{
    pages: PageMetadata[]
    blocks: Array<Block & { pageId: string }>
  }> {
    const pages = await pageDB.getAll()
    const db = await openDatabase()
    const allBlocks = await db.getAll('blocks')
    
    return {
      pages: Array.from(pages.values()),
      blocks: allBlocks as any,
    }
  },

  /**
   * 导入数据（用于恢复）
   */
  async importData(data: {
    pages: PageMetadata[]
    blocks: Array<Block & { pageId: string }>
  }): Promise<void> {
    await pageDB.saveAll(data.pages)
    await blockDB.saveAll(data.blocks)
  },
}

