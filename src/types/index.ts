/**
 * 核心数据模型定义
 * 
 * 设计理念：
 * 1. 扁平化存储：所有 Block 存储在 Map 中，通过 ID 索引，避免深度嵌套带来的性能问题
 * 2. 树形结构：通过 parentId 和 childrenIds 维护层级关系
 * 3. 类型安全：使用 TypeScript 严格类型定义
 */

/**
 * Block 类型枚举
 */
export enum BlockType {
  PAGE = 'page',           // 页面（文档）
  HEADING_1 = 'heading_1',
  HEADING_2 = 'heading_2',
  HEADING_3 = 'heading_3',
  PARAGRAPH = 'paragraph', // 段落
  BULLET_LIST = 'bullet_list',
  NUMBERED_LIST = 'numbered_list',
  TODO = 'todo',           // 待办
  TOGGLE = 'toggle',       // 折叠块
  CODE = 'code',           // 代码块
  QUOTE = 'quote',         // 引用
  CALENDAR = 'calendar',   // 日历组件（自定义节点）
  IMAGE = 'image',         // 图片
  DIVIDER = 'divider',     // 分割线
}

/**
 * Block 内容类型
 * 使用联合类型，根据 blockType 确定具体类型
 */
export type BlockContent = 
  | TextContent           // 文本内容（段落、标题等）
  | CodeContent          // 代码内容
  | ImageContent         // 图片内容
  | CalendarContent      // 日历内容
  | ListContent          // 列表内容

/**
 * 文本内容（Tiptap JSON 格式）
 */
export interface TextContent {
  type: 'doc'
  content: Array<{
    type: string
    attrs?: Record<string, any>
    content?: any[]
  }>
}

/**
 * 代码内容
 */
export interface CodeContent {
  language: string
  code: string
}

/**
 * 图片内容
 */
export interface ImageContent {
  url: string
  alt?: string
  width?: number
  height?: number
}

/**
 * 日历内容
 */
export interface CalendarContent {
  events: Array<{
    date: string  // YYYY-MM-DD
    title: string
    color?: string
  }>
  viewMode: 'month' | 'week' | 'day'
}

/**
 * 列表内容
 */
export interface ListContent {
  items: string[]
  checked?: boolean[]  // 用于待办列表
}

/**
 * Block 基础接口
 * 所有块都继承这个接口
 */
export interface Block {
  id: string                    // 唯一标识符
  type: BlockType              // 块类型
  content: BlockContent        // 块内容（根据类型不同而不同）
  parentId: string | null     // 父块 ID（null 表示根节点）
  childrenIds: string[]        // 子块 ID 数组
  order: number               // 排序索引
  createdAt: number           // 创建时间戳
  updatedAt: number           // 更新时间戳
  collapsed?: boolean          // 是否折叠（用于 toggle 块）
}

/**
 * 文档（Page）元数据
 */
export interface PageMetadata {
  id: string
  title: string
  emoji?: string              // Emoji 图标
  cover?: string              // 封面图 URL
  icon?: string               // 自定义图标 URL
  createdAt: number
  updatedAt: number
  parentId: string | null     // 父页面 ID（用于文件夹结构）
  childrenIds: string[]       // 子页面 ID 数组
  order: number              // 排序索引
}

/**
 * 文档树节点（用于侧边栏渲染）
 */
export interface TreeNode {
  id: string
  title: string
  emoji?: string
  icon?: string
  children: TreeNode[]
  metadata: PageMetadata
}

/**
 * 扁平化的文档树存储结构
 * key: pageId, value: PageMetadata
 */
export type PageMap = Map<string, PageMetadata>

/**
 * 扁平化的 Block 存储结构
 * key: blockId, value: Block
 */
export type BlockMap = Map<string, Block>

/**
 * 文档完整数据（包含所有 Block）
 */
export interface Document {
  page: PageMetadata
  blocks: BlockMap
  rootBlockId: string | null  // 根 Block ID（通常是第一个 Block）
}

