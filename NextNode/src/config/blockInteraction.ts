/**
 * 块级交互演示配置
 * 可以在 router/index.ts 中添加这个路由
 * 注：如果 BlockInteractionExample.vue 不存在，请注释掉这个路由配置
 */

// export const blockInteractionRoute = {
//   path: '/block-interaction-demo',
//   name: 'BlockInteractionDemo',
//   component: () => import('@/views/BlockInteractionExample.vue'),
//   meta: {
//     title: '块级交互演示',
//     description: '展示完整的拖拽、删除、复制、类型转换功能'
//   }
// }

/**
 * 使用方式：
 * 
 * 在 src/router/index.ts 中添加：
 * 
 * import { blockInteractionRoute } from '@/config/blockInteractionDemo'
 * 
 * const routes = [
 *   // ... 其他路由
 *   blockInteractionRoute
 * ]
 * 
 * 然后访问 http://localhost:5173/block-interaction-demo
 */

// 块操作日志记录工具
export class BlockOperationLogger {
  private logs: Array<{
    timestamp: number
    action: string
    blockType?: string
    details?: any
  }> = []

  private maxLogs = 100

  log(action: string, blockType?: string, details?: any) {
    this.logs.push({
      timestamp: Date.now(),
      action,
      blockType,
      details
    })

    // 保持日志数量在限制内
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    console.log(`[BlockOp] ${action}`, { blockType, details })
  }

  getLogs() {
    return this.logs
  }

  clearLogs() {
    this.logs = []
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2)
  }
}

// 创建全局日志实例
export const blockOperationLogger = new BlockOperationLogger()

/**
 * 通知系统集成示例
 */
export interface NotificationOptions {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
}

export class NotificationManager {
  private notifications: Map<string, NotificationOptions> = new Map()

  show(options: NotificationOptions) {
    const id = Date.now().toString()
    this.notifications.set(id, options)

    // 自动关闭
    if (options.duration !== -1) {
      setTimeout(() => this.close(id), options.duration || 3000)
    }

    return id
  }

  close(id: string) {
    this.notifications.delete(id)
  }

  clear() {
    this.notifications.clear()
  }

  success(message: string, title = '成功') {
    return this.show({
      type: 'success',
      title,
      message
    })
  }

  error(message: string, title = '错误') {
    return this.show({
      type: 'error',
      title,
      message,
      duration: 5000
    })
  }

  warning(message: string, title = '警告') {
    return this.show({
      type: 'warning',
      title,
      message,
      duration: 4000
    })
  }

  info(message: string, title = '提示') {
    return this.show({
      type: 'info',
      title,
      message,
      duration: 3000
    })
  }
}

export const notificationManager = new NotificationManager()

/**
 * 块操作事件处理示例
 */
export function setupBlockInteractionHandlers(
  onAction?: (action: string, blockType?: string) => void
) {
  return (event: { action: string; blockType?: string }) => {
    const { action, blockType } = event

    // 记录操作
    blockOperationLogger.log(action, blockType)

    // 显示通知
    switch (action) {
      case 'delete':
        notificationManager.success('块已删除')
        break
      case 'duplicate':
        notificationManager.success('块已复制')
        break
      case 'convertType':
        notificationManager.success(`已转换为 ${blockType}`)
        break
    }

    // 调用自定义回调
    onAction?.(action, blockType)
  }
}

/**
 * 块操作快捷键配置
 */
export const blockShortcuts = {
  delete: ['Delete', 'Backspace'],
  duplicate: ['Ctrl+D', 'Cmd+D'],
  convertToHeading1: ['Ctrl+Alt+1', 'Cmd+Alt+1'],
  convertToHeading2: ['Ctrl+Alt+2', 'Cmd+Alt+2'],
  convertToList: ['Ctrl+Shift+L', 'Cmd+Shift+L'],
}

/**
 * 快捷键处理
 */
export function handleBlockShortcut(event: KeyboardEvent) {
  const key = `${event.ctrlKey || event.metaKey ? 'Ctrl+' : ''}${
    event.shiftKey ? 'Shift+' : ''
  }${event.altKey ? 'Alt+' : ''}${event.key}`

  // 可以在这里根据快捷键执行相应操作
  console.log('Shortcut pressed:', key)
}
