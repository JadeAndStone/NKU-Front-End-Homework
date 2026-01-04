<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import BlockActionMenu from './BlockActionMenu.vue'

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['action'])

// 显示菜单的位置
const showMenu = ref(false)
const menuPosition = ref<{ x: number; y: number } | null>(null)
const menuDraggedElement = ref<HTMLElement | null>(null) // 记录菜单对应的块元素
const hoveredBlock = ref<HTMLElement | null>(null)

// 悬停计时器：延迟打开菜单
const hoverTimer = ref<number | null>(null)

// 菜单关闭计时器：当鼠标离开块区域超过0.5s时关闭菜单
const menuCloseTimer = ref<number | null>(null)

// 节流函数
let lastMoveTime = 0
const MOVE_THROTTLE = 16 // 约 60fps

// 获取块类型
const getBlockType = (element: HTMLElement | null): string => {
  if (!element) return 'unknown'
  
  const tagName = element.tagName.toLowerCase()
  
  // 检查是否为特殊元素
  if (tagName === 'img') return 'image'
  if (tagName === 'pre') return 'codeBlock'
  
  // 优先检查 data-node-view-wrapper（Vue NodeView 包裹的组件）
  // 这会匹配日历和看板等自定义组件
  if (element.hasAttribute('data-node-view-wrapper')) {
    // 检查 data-type 属性
    const dataType = element.getAttribute('data-type')
    if (dataType === 'calendar') return 'calendar'
    if (dataType === 'kanban') return 'kanban'
    
    // 检查内部是否有日历组件
    if (element.querySelector('calendar-component') || 
        element.querySelector('.calendar-wrapper') ||
        element.querySelector('[class*="calendar"]')) {
      return 'calendar'
    }
    
    // 检查内部是否有看板组件
    if (element.querySelector('kanban-board') || 
        element.querySelector('.kanban-wrapper') ||
        element.querySelector('[class*="kanban"]')) {
      return 'kanban'
    }
    
    // 如果有其他 data-type
    if (dataType) return dataType
    
    // 默认返回自定义组件类型
    return 'custom'
  }
  
  // 检查标签名
  if (tagName === 'calendar-component') return 'calendar'
  if (tagName === 'kanban-component' || tagName === 'kanban-board') return 'kanban'
  
  // 检查 data-type 属性
  const dataType = element.getAttribute('data-type')
  if (dataType === 'calendar') return 'calendar'
  if (dataType === 'kanban') return 'kanban'
  
  // 标准块类型
  if (tagName === 'p') return 'paragraph'
  if (tagName.startsWith('h') && tagName.length === 2) return `heading_${tagName.charAt(1)}`
  if (tagName === 'blockquote') return 'blockquote'
  if (tagName === 'ul' || element.closest('ul')) return 'bulletList'
  if (tagName === 'ol' || element.closest('ol')) return 'numberedList'
  
  return 'text'
}

// 判断块是否有内容
const isBlockNotEmpty = (el: HTMLElement | null) => {
  if (!el) return false
  
  if (el.tagName === 'IMG') return true
  if (el.tagName === 'PRE') return true
  if (el.tagName === 'CALENDAR-COMPONENT') return true
  if (el.tagName === 'KANBAN-COMPONENT') return true
  if (el.hasAttribute && el.hasAttribute('data-node-view-wrapper')) return true
  if (el.hasAttribute && el.hasAttribute('data-type')) return true
  
  if (el.querySelector && el.querySelector('img, video, svg, iframe, canvas, [data-type], calendar-component, kanban-component, [data-node-view-wrapper]')) return true
  
  const txt = (el.textContent || '').replace(/\uFEFF/g, '').trim()
  return txt.length > 0
}

// 监听鼠标移动，在悬停块上时自动打开菜单
const handleMouseMove = (event: MouseEvent) => {
  const now = Date.now()
  if (now - lastMoveTime < MOVE_THROTTLE) {
    return
  }
  lastMoveTime = now

  const target = event.target as HTMLElement
  
  const editorContent = document.querySelector('.ProseMirror')
  if (!editorContent) {
    showMenu.value = false
    return
  }

  // 跳过菜单区域和拖拽手柄
  if (target.closest('.block-action-menu') || target.closest('.custom-drag-handle')) {
    if (hoverTimer.value) {
      window.clearTimeout(hoverTimer.value)
      hoverTimer.value = null
    }
    return
  }

  // 如果菜单已打开，检查是否离开编辑器区域
  if (showMenu.value && menuDraggedElement.value) {
    if (!editorContent.contains(target)) {
      // 鼠标离开编辑器区域，关闭菜单
      showMenu.value = false
      menuDraggedElement.value = null
      menuPosition.value = null
      return
    }
    // 继续执行后续逻辑，允许切换到新块
  }

  if (!editorContent.contains(target)) {
    showMenu.value = false
    if (hoverTimer.value) {
      window.clearTimeout(hoverTimer.value)
      hoverTimer.value = null
      hoveredBlock.value = null
    }
    return
  }

  // 找到最近的块元素
  let blockElement = target.closest('p, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, li, pre, img, .node-view-content, [data-type], calendar-component, kanban-component, kanban-board, [data-node-view-wrapper]')
  
  if (blockElement && blockElement.tagName === 'IMG') {
    blockElement = blockElement.closest('p, figure, div[data-type]') || blockElement
  }
  
  // 如果当前元素是 blockquote 内的子元素（如 p），提升到 blockquote 级别
  // 这样在引用块内移动鼠标时不会因为切换子元素而关闭菜单
  const parentBlockquote = (blockElement as HTMLElement)?.closest('blockquote')
  if (parentBlockquote && editorContent.contains(parentBlockquote)) {
    blockElement = parentBlockquote
  }
  
  // 同样处理列表：如果在列表内，提升到整个列表级别
  const parentList = (blockElement as HTMLElement)?.closest('ul, ol')
  if (parentList && editorContent.contains(parentList)) {
    blockElement = parentList
  }
  
  if (!blockElement) {
    // 如果菜单已打开，启动0.5s关闭计时器
    if (showMenu.value && menuDraggedElement.value) {
      if (!menuCloseTimer.value) {
        menuCloseTimer.value = window.setTimeout(() => {
          showMenu.value = false
          menuDraggedElement.value = null
          menuPosition.value = null
          menuCloseTimer.value = null
        }, 500)
      }
      return
    }
    if (hoverTimer.value) {
      window.clearTimeout(hoverTimer.value)
      hoverTimer.value = null
      hoveredBlock.value = null
    }
    return
  }

  // 如果该块为空，不打开菜单（启动关闭计时器）
  if (!isBlockNotEmpty(blockElement as HTMLElement)) {
    if (showMenu.value && menuDraggedElement.value) {
      if (!menuCloseTimer.value) {
        menuCloseTimer.value = window.setTimeout(() => {
          showMenu.value = false
          menuDraggedElement.value = null
          menuPosition.value = null
          menuCloseTimer.value = null
        }, 500)
      }
      return
    }
    if (hoverTimer.value) {
      window.clearTimeout(hoverTimer.value)
      hoverTimer.value = null
      hoveredBlock.value = null
    }
    return
  }

  const rect = (blockElement as HTMLElement).getBoundingClientRect()
  const editorRect = editorContent.getBoundingClientRect()

  // 鼠标回到有效块区域，取消关闭计时器
  if (menuCloseTimer.value) {
    window.clearTimeout(menuCloseTimer.value)
    menuCloseTimer.value = null
  }

  // 启动悬停计时器
  if (hoveredBlock.value !== (blockElement as HTMLElement)) {
    if (hoverTimer.value) {
      window.clearTimeout(hoverTimer.value)
      hoverTimer.value = null
    }
    hoveredBlock.value = blockElement as HTMLElement
    
    // 如果菜单已打开且当前悬停的是不同的块，准备切换
    const currentBlock = hoveredBlock.value
    const isNewBlock = menuDraggedElement.value !== currentBlock
    
    hoverTimer.value = window.setTimeout(() => {
      if (!hoveredBlock.value || hoveredBlock.value !== currentBlock) {
        hoverTimer.value = null
        return
      }

      // 如果是新块，关闭旧菜单并打开新菜单
      if (isNewBlock || !showMenu.value) {
        const blockRect = currentBlock.getBoundingClientRect()
        const editorContentEl = document.querySelector('.ProseMirror')
        const editorRectNew = editorContentEl?.getBoundingClientRect()
        
        menuDraggedElement.value = currentBlock
        menuPosition.value = {
          x: (editorRectNew?.left || editorRect.left) + 20,
          y: blockRect.top + window.scrollY,
        }
        showMenu.value = true
      }
      hoverTimer.value = null
    }, 800)
  }
}

// 处理块操作菜单的动作
const handleMenuAction = (action: string, blockType?: string) => {
  if (!menuDraggedElement.value || !props.editor) return

  const editor = props.editor

  switch (action) {
    case 'delete':
      deleteBlock()
      break

    case 'duplicate':
      duplicateBlock()
      break

    case 'convertType':
      if (blockType) {
        convertBlockType(blockType)
      }
      break
  }

  showMenu.value = false
  menuDraggedElement.value = null
  emit('action', { action, blockType })
}

// 删除块
const deleteBlock = async () => {
  if (!menuDraggedElement.value || !props.editor) return

  const element = menuDraggedElement.value
  const editor = props.editor

  try {
    // 获取元素在编辑器中的位置
    let pos = editor.view.posAtDOM(element, 0)
    
    // 解析位置找到顶级块节点
    const resolvedPos = editor.state.doc.resolve(pos)
    
    // 找到 depth=1 的顶级块节点（文档直接子节点）
    let nodeStart = pos
    let nodeEnd = pos
    
    if (resolvedPos.depth >= 1) {
      // 获取顶级块的起始位置
      nodeStart = resolvedPos.before(1)
      const topNode = resolvedPos.node(1)
      nodeEnd = nodeStart + topNode.nodeSize
    } else {
      // 当前位置就是顶级节点
      const node = resolvedPos.nodeAfter
      if (node) {
        nodeEnd = pos + node.nodeSize
      }
    }
    
    const isLastNode = nodeEnd >= editor.state.doc.content.size
    const isFirstNode = nodeStart <= 0
    
    if (isLastNode && isFirstNode) {
      // 如果是唯一的节点，删除后插入空段落
      editor.chain()
        .focus()
        .deleteRange({ from: nodeStart, to: nodeEnd })
        .insertContentAt(0, { type: 'paragraph' })
        .focus('start')
        .run()
    } else {
      // 删除节点，并将光标移到上一行
      const focusPos = nodeStart > 0 ? nodeStart - 1 : 0
      editor.chain()
        .focus()
        .deleteRange({ from: nodeStart, to: nodeEnd })
        .setTextSelection(focusPos)
        .run()
    }
  } catch (error) {
    console.error('Error deleting block:', error)
  }
}

// 复制块
const duplicateBlock = async () => {
  if (!menuDraggedElement.value || !props.editor) return

  const element = menuDraggedElement.value
  const editor = props.editor

  try {
    // 获取元素在编辑器中的位置
    let pos = editor.view.posAtDOM(element, 0)
    const resolvedPos = editor.state.doc.resolve(pos)
    
    // 找到 depth=1 的顶级块节点
    let nodeStart = pos
    let node = resolvedPos.nodeAfter
    
    if (resolvedPos.depth >= 1) {
      nodeStart = resolvedPos.before(1)
      node = resolvedPos.node(1)
    }
    
    if (!node) {
      throw new Error('Cannot find node at position')
    }

    const nodeEnd = nodeStart + node.nodeSize
    editor.chain()
      .focus()
      .insertContentAt(nodeEnd, node.toJSON())
      .run()
  } catch (error) {
    console.error('Error duplicating block:', error)
  }
}

// 转换块类型
const convertBlockType = (targetType: string) => {
  if (!menuDraggedElement.value || !props.editor) return

  const element = menuDraggedElement.value
  const editor = props.editor

  try {
    // 首先将光标移动到目标元素内
    let pos = editor.view.posAtDOM(element, 0)
    const resolvedPos = editor.state.doc.resolve(pos)
    
    // 找到要操作的节点位置
    let targetPos = pos
    if (resolvedPos.depth >= 1) {
      // 获取顶级块内的第一个可编辑位置
      targetPos = resolvedPos.before(1) + 1
    }
    
    // 先将选择移到目标块内
    editor.chain().focus().setTextSelection(targetPos).run()
    
    // 等待选择更新后再进行类型转换
    setTimeout(() => {
      const { $anchor } = editor.state.selection
      const currentNode = $anchor.node($anchor.depth)
      const currentNodeType = currentNode?.type?.name || ''

      let chain = editor.chain().focus()

      // 如果当前是列表项，先提升出来
      if (currentNodeType === 'listItem') {
        chain = chain.liftListItem('listItem')
      }

      // 如果当前是引用块，先退出引用
      const parentNode = $anchor.node($anchor.depth - 1)
      if (parentNode?.type?.name === 'blockquote') {
        chain = chain.lift('blockquote')
      }

      chain.run()

      // 再次等待后应用目标类型
      setTimeout(() => {
        let targetChain = editor.chain().focus()

        switch (targetType) {
          case 'paragraph':
            targetChain = targetChain.setParagraph()
            break
          case 'heading_1':
            targetChain = targetChain.setParagraph().setHeading({ level: 1 })
            break
          case 'heading_2':
            targetChain = targetChain.setParagraph().setHeading({ level: 2 })
            break
          case 'heading_3':
            targetChain = targetChain.setParagraph().setHeading({ level: 3 })
            break
          case 'bulletList':
            targetChain = targetChain.setParagraph().toggleBulletList()
            break
          case 'numberedList':
            targetChain = targetChain.setParagraph().toggleOrderedList()
            break
          case 'blockquote':
            targetChain = targetChain.setParagraph().toggleBlockquote()
            break
        }

        targetChain.run()
      }, 50)
    }, 50)
  } catch (error) {
    console.error('Failed to convert block type:', error)
  }
}

// 全局点击处理
const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null
  if (!target) return

  const editorContent = document.querySelector('.ProseMirror')
  if (editorContent && editorContent.contains(target)) return
  if (target.closest('.block-action-menu')) return
  if (target.closest('.custom-drag-handle')) return

  showMenu.value = false
  menuDraggedElement.value = null
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove, { passive: true })
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('click', handleDocumentClick)
  
  if (hoverTimer.value) {
    window.clearTimeout(hoverTimer.value)
    hoverTimer.value = null
  }
  
  if (menuCloseTimer.value) {
    window.clearTimeout(menuCloseTimer.value)
    menuCloseTimer.value = null
  }
})
</script>

<template>
  <div class="drag-handle-menu-container">
    <!-- 块操作菜单 -->
    <Teleport to="body">
      <BlockActionMenu
        v-if="showMenu && menuPosition"
        :position="menuPosition"
        :block-element="menuDraggedElement"
        :block-type="getBlockType(menuDraggedElement)"
        @action="handleMenuAction"
        @close="showMenu = false; menuDraggedElement = null"
      />
    </Teleport>
  </div>
</template>

<style scoped>
/* 此组件现在只负责菜单逻辑，拖拽由官方 DragHandle 处理 */
</style>

