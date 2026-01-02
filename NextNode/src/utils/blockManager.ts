/**
 * 块拖拽和动画管理器
 * 处理块的拖拽、删除、复制等操作的动画和数据同步
 */

import { TextSelection } from '@tiptap/pm/state'

export class BlockManager {
  private editor: any
  private blockCache: Map<string, HTMLElement> = new Map()
  private animatingBlocks: Set<string> = new Set()

  constructor(editor: any) {
    this.editor = editor
  }

  /**
   * 获取所有块元素
   */
  getBlocks(): HTMLElement[] {
    const editorContent = document.querySelector('.ProseMirror')
    if (!editorContent) return []
    return Array.from(
      editorContent.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, li, pre, [data-type]')
    ) as HTMLElement[]
  }

  /**
   * 获取块的位置信息
   */
  getBlockRect(element: HTMLElement) {
    const rect = element.getBoundingClientRect()
    const editorContent = document.querySelector('.ProseMirror')
    const editorRect = editorContent?.getBoundingClientRect() || { top: 0, left: 0 }

    return {
      top: rect.top - editorRect.top,
      left: rect.left - editorRect.left,
      width: rect.width,
      height: rect.height,
      absoluteTop: rect.top + window.scrollY,
      absoluteLeft: rect.left + window.scrollX,
    }
  }

  /**
   * 删除块并添加动画
   */
  deleteBlock(element: HTMLElement) {
    // 添加删除动画
    element.classList.add('delete-animation')

    return new Promise<void>((resolve) => {
      element.addEventListener('animationend', () => {
        // 从DOM中移除
        element.remove()
        resolve()
      }, { once: true })

      // 如果浏览器不支持动画，直接移除
      setTimeout(() => {
        if (element.parentElement) {
          element.remove()
          resolve()
        }
      }, 300)
    })
  }

  /**
   * 复制块
   */
  async duplicateBlock(element: HTMLElement) {
    const clone = element.cloneNode(true) as HTMLElement

    // 添加插入动画
    clone.classList.add('insert-animation')
    clone.style.opacity = '0'

    // 在原元素下方插入
    element.insertAdjacentElement('afterend', clone)

    // 触发动画
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        clone.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
        clone.style.opacity = '1'
        clone.style.transform = 'translateY(0)'
        resolve(null)
      })
    })

    return clone
  }

  /**
   * 转换块类型
   */
  convertBlockType(element: HTMLElement, targetType: string) {
    if (!this.editor) return

    const typeMap: Record<string, () => void> = {
      paragraph: () => this.editor.chain().focus().setParagraph().run(),
      heading_1: () => this.editor.chain().focus().toggleHeading({ level: 1 }).run(),
      heading_2: () => this.editor.chain().focus().toggleHeading({ level: 2 }).run(),
      heading_3: () => this.editor.chain().focus().toggleHeading({ level: 3 }).run(),
      bulletList: () => this.editor.chain().focus().toggleBulletList().run(),
      numberedList: () => this.editor.chain().focus().toggleOrderedList().run(),
      blockquote: () => this.editor.chain().focus().toggleBlockquote().run(),
      codeBlock: () => this.editor.chain().focus().toggleCodeBlock().run(),
    }

    // 获取块在编辑器中的位置，然后执行转换
    const pos = this.editor.view.posAtDOM(element, 0)
    this.editor.view.dispatch(this.editor.state.tr.setSelection(TextSelection.near(pos)))
    typeMap[targetType]?.()
  }

  /**
   * 移动块（拖拽）
   */
  moveBlock(sourceElement: HTMLElement, targetElement: HTMLElement, position: 'before' | 'after') {
    const container = sourceElement.parentElement
    if (!container) return

    const sourceClone = sourceElement.cloneNode(true) as HTMLElement
    sourceClone.classList.add('move-animation')

    if (position === 'before') {
      targetElement.insertAdjacentElement('beforebegin', sourceClone)
    } else {
      targetElement.insertAdjacentElement('afterend', sourceClone)
    }

    // 删除原元素
    sourceElement.classList.add('fade-out')
    setTimeout(() => sourceElement.remove(), 200)
  }

  /**
   * 高亮块（临时）
   */
  highlightBlock(element: HTMLElement, duration: number = 500) {
    element.classList.add('highlight-block')
    setTimeout(() => {
      element.classList.remove('highlight-block')
    }, duration)
  }

  /**
   * 清空缓存
   */
  clear() {
    this.blockCache.clear()
    this.animatingBlocks.clear()
  }
}

export default BlockManager
