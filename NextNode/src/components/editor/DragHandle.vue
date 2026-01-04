<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { GripVertical } from 'lucide-vue-next'
import { NodeSelection } from '@tiptap/pm/state'
import BlockActionMenu from './BlockActionMenu.vue'

const props = defineProps({
  editor: {
    type: Object,
    required: true
  },
  // 是否根据段落高度自动调整手柄高度
  handleAutoSize: {
    type: Boolean,
    default: true,
  },
  // 手柄最小高度（像素）
  minHandleHeight: {
    type: Number,
    default: 24,
  },
  // 手柄最大高度（像素）
  maxHandleHeight: {
    type: Number,
    default: 1600,
  },
  // 手柄宽度（像素）
  handleWidth: {
    type: Number,
    default: 28,
  },
})

const emit = defineEmits(['action'])

// 显示菜单的位置
const showMenu = ref(false)
const menuPosition = ref<{ x: number; y: number } | null>(null)
const handlePosition = ref<{ x: number; y: number } | null>(null)
const draggedElement = ref<HTMLElement | null>(null)
const menuDraggedElement = ref<HTMLElement | null>(null) // 记录菜单打开时的元素

// 悬停计时器：延迟打开菜单（500ms）
const hoverTimer = ref<number | null>(null)
const hoveredBlock = ref<HTMLElement | null>(null)
const pinnedElement = ref<HTMLElement | null>(null) // 锁定显示的元素，防止手柄在轻微移动时消失
const handleHeight = ref<number | null>(null)

const setHandleSizeFromRect = (rect: DOMRect | null) => {
  if (!props.handleAutoSize || !rect) {
    handleHeight.value = props.minHandleHeight
    return
  }
  let h = Math.max(props.minHandleHeight, Math.min(props.maxHandleHeight, Math.round(rect.height)))
  handleHeight.value = h
}

// 拖拽状态
const isDragging = ref(false)
const dragStartPos = ref<{ x: number; y: number } | null>(null)
const dragOffset = ref<{ x: number; y: number }>({ x: 0, y: 0 })

// 节流函数 - 减少 mousemove 的处理频率
let lastMoveTime = 0
const MOVE_THROTTLE = 16 // 约 60fps

// 获取块类型
const getBlockType = (element: HTMLElement | null): string => {
  if (!element) return 'unknown'
  
  const tagName = element.tagName.toLowerCase()
  
  // 检查是否为特殊元素（不需要类型转换）
  if (tagName === 'img') return 'image'
  if (tagName === 'calendar-component' || element.getAttribute('data-type') === 'calendar') return 'calendar'
  if (tagName === 'kanban-component' || element.getAttribute('data-type') === 'kanban') return 'kanban'
  
  // 检查是否包含日历或看板组件的子元素
  if (element.querySelector('.calendar-wrapper')) return 'calendar'
  if (element.querySelector('.kanban-wrapper')) return 'kanban'
  
  // 检查 data-node-view-wrapper
  if (element.hasAttribute('data-node-view-wrapper')) {
    const dataType = element.getAttribute('data-type')
    if (dataType) return dataType
    // 如果没有 data-type，检查 class
    if (element.classList.contains('calendar-wrapper')) return 'calendar'
    if (element.classList.contains('kanban-wrapper')) return 'kanban'
  }
  
  // 标准块类型
  if (tagName === 'p') return 'paragraph'
  if (tagName.startsWith('h')) return `heading_${tagName.charAt(1)}`
  if (tagName === 'blockquote') return 'blockquote'
  if (tagName === 'ul' || element.closest('ul')) return 'bulletList'
  if (tagName === 'ol' || element.closest('ol')) return 'numberedList'
  if (tagName === 'pre') return 'codeBlock'
  
  return 'text'
}

// 判断块是否包含内容（文本或媒体/自定义节点）
const isBlockNotEmpty = (el: HTMLElement | null) => {
  if (!el) return false
  
  // 图片、代码块、自定义节点都视为非空
  if (el.tagName === 'IMG') return true
  if (el.tagName === 'PRE') return true
  if (el.tagName === 'CALENDAR-COMPONENT') return true
  if (el.tagName === 'KANBAN-COMPONENT') return true
  if (el.hasAttribute && el.hasAttribute('data-node-view-wrapper')) return true
  if (el.hasAttribute && el.hasAttribute('data-type')) return true
  
  // 查询子元素中是否有媒体或自定义节点
  if (el.querySelector && el.querySelector('img, video, svg, iframe, canvas, [data-type], calendar-component, kanban-component, [data-node-view-wrapper]')) return true
  
  // 检查文本内容
  const txt = (el.textContent || '').replace(/\uFEFF/g, '').trim()
  return txt.length > 0
}

// 监听鼠标移动，显示/隐藏拖拽手柄，并自动打开菜单
const handleMouseMove = (event: MouseEvent) => {
  // 不再在菜单打开时直接返回；允许在菜单打开时更新目标块位置

  const now = Date.now()
  if (now - lastMoveTime < MOVE_THROTTLE) {
    return
  }
  lastMoveTime = now

  const target = event.target as HTMLElement
  
  // 只在编辑器内容区域响应
  const editorContent = document.querySelector('.ProseMirror')
  if (!editorContent) {
    handlePosition.value = null
    showMenu.value = false
    return
  }

  // 备注：当存在 pinnedElement 且鼠标移动到编辑器的非块区域时，保持手柄显示在 pinnedElement。
  // 但如果鼠标移动到其它块（blockElement），下面的逻辑会更新 pinnedElement 并移动菜单。

  // 跳过手柄本身和菜单
  if (target.closest('.drag-handle') || target.closest('.block-action-menu')) {
    // 如果移到手柄或菜单区域，取消当前悬停计时
    if (hoverTimer.value) {
      window.clearTimeout(hoverTimer.value)
      hoverTimer.value = null
      hoveredBlock.value = null
    }
    return
  }

  if (!editorContent.contains(target)) {
    // 鼠标离开编辑器区域：
    // - 如果之前有锁定的元素（pinnedElement），保持手柄显示并可点击（菜单对应最后一个出现的段落）
    // - 否则隐藏手柄和菜单
    if (pinnedElement.value) {
      const rectPinned = pinnedElement.value.getBoundingClientRect()
      const editorRectPinned = editorContent.getBoundingClientRect()
      const handleX = editorRectPinned.left - 45
      const h = handleHeight.value || props.minHandleHeight
      const handleY = rectPinned.top + window.scrollY + (rectPinned.height - h) / 2
      handlePosition.value = { x: handleX, y: handleY }
      // 保持 draggedElement 为 pinnedElement，允许点击打开其菜单
      draggedElement.value = pinnedElement.value
      if (hoverTimer.value) {
        window.clearTimeout(hoverTimer.value)
        hoverTimer.value = null
      }
      return
    }

    // 无锁定元素则隐藏
    handlePosition.value = null
    showMenu.value = false
    if (hoverTimer.value) {
      window.clearTimeout(hoverTimer.value)
      hoverTimer.value = null
      hoveredBlock.value = null
    }
    return
  }

  // 如果正在拖拽，不更新手柄位置
  if (isDragging.value) {
    return
  }

  // 找到最近的块元素（段落、标题、代码块、图片、自定义节点等）
  let blockElement = target.closest('p, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, li, pre, img, .node-view-content, [data-type], calendar-component, kanban-component, [data-node-view-wrapper]')
  
  // 如果找到了图片，需要往上找到它的块级父元素
  if (blockElement && blockElement.tagName === 'IMG') {
    blockElement = blockElement.closest('p, figure, div[data-type]') || blockElement
  }
  
  if (!blockElement) {
    // 编辑器内非块区域（例如段落间空白），如果之前有锁定元素则保持手柄显示
    if (pinnedElement.value) {
      const rectPinned = pinnedElement.value.getBoundingClientRect()
      const editorRectPinned = editorContent.getBoundingClientRect()
      const handleX = editorRectPinned.left - 45
      const handleY = rectPinned.top + window.scrollY + 8
      handlePosition.value = { x: handleX, y: handleY }
      // 保持 draggedElement 为 pinnedElement
      draggedElement.value = pinnedElement.value
      return
    }

    handlePosition.value = null
    showMenu.value = false
    if (hoverTimer.value) {
      window.clearTimeout(hoverTimer.value)
      hoverTimer.value = null
      hoveredBlock.value = null
    }
    return
  }

  // 如果该块为空，则不自动打开菜单（但仍更新手柄位置）
  const blockHasContent = isBlockNotEmpty(blockElement as HTMLElement)
  const rect = (blockElement as HTMLElement).getBoundingClientRect()
  const editorRect = editorContent.getBoundingClientRect()
  if (!blockHasContent) {
    const handleX = editorRect.left - 45
    // 对于空块使用最小高度并垂直居中
    setHandleSizeFromRect(rect)
    const h = handleHeight.value || props.minHandleHeight
    const handleY = rect.top + window.scrollY + (rect.height - h) / 2
    handlePosition.value = { x: handleX, y: handleY }
    draggedElement.value = blockElement as HTMLElement
    menuDraggedElement.value = null
    showMenu.value = false
    if (hoverTimer.value) {
      window.clearTimeout(hoverTimer.value)
      hoverTimer.value = null
      hoveredBlock.value = null
    }
    return
  }

  // 计算手柄在视口中的位置
  const handleX = editorRect.left - 45  // 编辑器左边距 45px
  const handleY = rect.top + window.scrollY + 8

  // 根据块高设置手柄大小并垂直居中显示
  setHandleSizeFromRect(rect)
  const h = handleHeight.value || props.minHandleHeight
  const centeredY = rect.top + window.scrollY + (rect.height - h) / 2
  handlePosition.value = {
    x: handleX,
    y: centeredY,
  }
  draggedElement.value = blockElement as HTMLElement

  // 如果菜单已打开，检查是否移动到了不同的块
  if (showMenu.value) {
    if (menuDraggedElement.value !== (blockElement as HTMLElement)) {
      // 移动到其他段落时关闭菜单，但保持手柄显示在新段落
      showMenu.value = false
      menuDraggedElement.value = null
      menuPosition.value = null
    }
    // 清理悬停计时器（如果有），并更新 hoveredBlock
    if (hoverTimer.value) {
      window.clearTimeout(hoverTimer.value)
      hoverTimer.value = null
    }
    hoveredBlock.value = blockElement as HTMLElement
    // 更新 pinnedElement 为当前块，保持手柄显示
    pinnedElement.value = blockElement as HTMLElement
    return
  }

  // 菜单未打开时，锁定当前元素，避免手柄在快速移动时消失，并启动悬停计时器
  pinnedElement.value = blockElement as HTMLElement
  if (hoveredBlock.value !== (blockElement as HTMLElement)) {
    if (hoverTimer.value) {
      window.clearTimeout(hoverTimer.value)
      hoverTimer.value = null
    }
    hoveredBlock.value = blockElement as HTMLElement
    hoverTimer.value = window.setTimeout(() => {
      // 在计时结束前如果菜单已被打开或元素不存在则取消
      if (!hoveredBlock.value || showMenu.value) {
        hoverTimer.value = null
        return
      }

      menuDraggedElement.value = hoveredBlock.value
      const menuPositionValue = {
        x: editorRect.left + 20,
        y: rect.top + window.scrollY,
      }
      menuPosition.value = menuPositionValue
      showMenu.value = true
      hoverTimer.value = null
    }, 800)
  }
}

// 点击手柄切换菜单显示状态
const handleDragHandleClick = (event: MouseEvent) => {
  event.stopPropagation()
  // 优先使用锁定的元素（pinned），然后使用当前拖拽元素
  const targetEl = (pinnedElement.value || draggedElement.value) as HTMLElement | null
  if (!targetEl) return

  // 如果该行没有内容，则不显示菜单
  if (!isBlockNotEmpty(targetEl)) return

  // 点击时切换菜单显示，并将菜单绑定到该元素
  menuDraggedElement.value = targetEl
  // 计算菜单位置基于该元素
  const rect = targetEl.getBoundingClientRect()
  const editorContent = document.querySelector('.ProseMirror')
  if (editorContent) {
    const editorRect = editorContent.getBoundingClientRect()
    menuPosition.value = { x: editorRect.left + 20, y: rect.top + window.scrollY }
  }
  showMenu.value = !showMenu.value
}

// 拖拽开始
const handleDragStart = (event: DragEvent) => {
  // 取消任何悬停计时
  if (hoverTimer.value) {
    window.clearTimeout(hoverTimer.value)
    hoverTimer.value = null
    hoveredBlock.value = null
  }

  // 选择菜单打开时记录的元素或当前拖拽元素
  let el = (menuDraggedElement.value || draggedElement.value) as HTMLElement | null
  if (!el || !props.editor) {
    return
  }

  const editor = props.editor
  const view = editor.view

  isDragging.value = true
  dragStartPos.value = { x: event.clientX, y: event.clientY }
  
  // 使用 ProseMirror 的标准拖拽方式
  // 1. 首先获取块的位置
  const coords = { left: event.clientX + 50, top: event.clientY }
  const pos = view.posAtCoords(coords)
  
  if (pos) {
    // 2. 找到该位置的节点
    const resolved = view.state.doc.resolve(pos.pos)
    let nodePos = pos.pos
    
    // 找到顶级块节点
    for (let d = resolved.depth; d >= 0; d--) {
      const node = resolved.node(d)
      if (node && node.type.isBlock && d === 1) {
        nodePos = resolved.before(d)
        break
      }
    }
    
    // 3. 创建节点选择并设置拖拽数据
    try {
      const selection = NodeSelection.create(view.state.doc, nodePos)
      view.dispatch(view.state.tr.setSelection(selection))
      
      const slice = view.state.selection.content()
      const { dom, text } = (view as any).serializeForClipboard(slice)
      
      event.dataTransfer!.clearData()
      event.dataTransfer!.setData('text/html', dom.innerHTML)
      event.dataTransfer!.setData('text/plain', text)
      event.dataTransfer!.effectAllowed = 'move'
      
      // 设置拖拽图像
      const selectedNode = document.querySelector('.ProseMirror-selectednode') as HTMLElement
      if (selectedNode) {
        event.dataTransfer!.setDragImage(selectedNode, 0, 0)
      }
      
      // 设置 view.dragging 让 ProseMirror 知道正在拖拽
      ;(view as any).dragging = { slice, move: true }
    } catch (e) {
      console.error('拖拽设置失败:', e)
    }
  }
  
  // 标记当前元素为被拖拽状态
  el.classList.add('dragging')
  el.classList.add('ghost-style')
  
  // 开始拖拽时取消锁定
  pinnedElement.value = null
  
  // 隐藏菜单，保留手柄位置
  showMenu.value = false
}

const handleDragEnd = () => {
  isDragging.value = false
  dragStartPos.value = null
  dragOffset.value = { x: 0, y: 0 }
  
  // 重置 view.dragging
  if (props.editor) {
    ;(props.editor.view as any).dragging = null
  }
  
  const targetEl = (menuDraggedElement.value || draggedElement.value) as HTMLElement | null
  targetEl?.classList.remove('dragging')
  targetEl?.classList.remove('ghost-style')
  
  // 移除所有拖拽相关的样式
  document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
    el.classList.remove('drag-over-top', 'drag-over-bottom')
  })
}

// 处理拖拽进入目标块
const handleDragOver = (event: DragEvent) => {
  if (!isDragging.value) return
  
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'move'
}

// 处理拖拽放置 - ProseMirror 会自动处理 drop 事件
const handleDrop = (event: DragEvent) => {
  // ProseMirror 的 DropCursor 扩展会自动处理位置指示
  // 拖拽完成后清理状态
  handleDragEnd()
}

// 处理块操作菜单的动作
const handleMenuAction = (action: string, blockType?: string) => {
  // 使用 menuDraggedElement 确保操作的是菜单打开时的块
  if (!menuDraggedElement.value || !props.editor) return

  const editor = props.editor

  switch (action) {
    case 'delete':
      // 删除块 - 找到块在编辑器中的位置
      deleteBlock()
      break

    case 'duplicate':
      // 复制块 - 复制当前块的内容
      duplicateBlock()
      break

    case 'convertType':
      // 转换块类型
      if (blockType) {
        convertBlockType(blockType)
      }
      break
  }

  showMenu.value = false
  menuDraggedElement.value = null
  emit('action', { action, blockType })
}

// 删除块的具体实现
const deleteBlock = async () => {
  if (!menuDraggedElement.value || !props.editor) return

  const element = menuDraggedElement.value
  const editor = props.editor

  try {
    // 获取块在编辑器中的位置
    const pos = editor.view.posAtDOM(element, 0)
    
    // 获取该位置的节点信息
    const resolvedPos = editor.state.doc.resolve(pos)
    const node = resolvedPos.nodeAfter
    
    if (!node) {
      throw new Error('Cannot find node at position')
    }

    // 计算节点的完整大小
    const nodeSize = node.nodeSize
    
    // 判断是否为文档中的最后一个节点
    const isLastNode = pos + nodeSize >= editor.state.doc.content.size - 1
    const isFirstNode = pos <= 1
    
    // 如果删除后会留下空文档，插入一个空段落
    if (isLastNode && isFirstNode) {
      editor.chain()
        .focus()
        .deleteRange({ from: pos, to: pos + nodeSize })
        .insertContentAt(pos, { type: 'paragraph' })
        .run()
    } else {
      // 直接删除节点，不留空行
      editor.chain()
        .focus()
        .deleteRange({ from: pos, to: pos + nodeSize })
        .run()
    }
    
  } catch (error) {
    console.error('Error deleting block:', error)
    
    // 备用删除方法
    try {
      const pos = editor.view.posAtDOM(element, 0)
      const node = editor.state.doc.nodeAt(pos)
      if (node) {
        const nodeSize = node.nodeSize
        editor.chain()
          .focus()
          .deleteRange({ from: pos, to: pos + nodeSize })
          .run()
      }
    } catch (err) {
      console.error('Fallback delete failed:', err)
    }
  }
}

// 复制块的具体实现
const duplicateBlock = async () => {
  if (!menuDraggedElement.value || !props.editor) return

  const element = menuDraggedElement.value
  const editor = props.editor

  try {
    // 获取块在编辑器中的位置
    const pos = editor.view.posAtDOM(element, 0)
    
    // 获取该位置的节点信息
    const node = editor.state.doc.nodeAt(pos)
    if (!node) {
      throw new Error('Cannot find node at position')
    }

    // 计算节点的完整大小
    const nodeSize = node.nodeSize

    // 在当前节点之后插入相同的节点
    editor.chain()
      .focus()
      .insertContentAt(pos + nodeSize, node)
      .run()
  } catch (error) {
    console.error('Error duplicating block:', error)
  }
}

// 转换块类型的具体实现
const convertBlockType = (targetType: string) => {
  if (!menuDraggedElement.value || !props.editor) return

  const editor = props.editor

  try {
    editor.chain().focus().run()

    const { $anchor } = editor.state.selection
    const currentNode = $anchor.node($anchor.depth)
    const currentNodeType = currentNode.type.name

    // 第一步：先转换为基础段落，删除列表和引用块的包装
    let chain = editor.chain().focus()

    // 如果当前是列表项，先提升出来
    if (currentNodeType === 'listItem') {
      chain = chain.liftListItem('listItem')
    }

    // 如果当前是引用块中的段落，先删除引用包装
    if (currentNodeType === 'paragraph' && $anchor.parent.type.name === 'blockquote') {
      chain = chain.setParagraph()
    }

    // 如果当前是分层列表，多次提升直到完全脱离列表
    if (currentNodeType === 'bulletList' || currentNodeType === 'orderedList') {
      while (chain && $anchor.parent.type.name === 'listItem') {
        chain = chain.liftListItem('listItem')
      }
    }

    // 执行一次中间命令，确保结构正确
    chain.run()

    // 第二步：再次获取当前状态，然后应用目标类型
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
    }, 100)
  } catch (error) {
    console.error('Failed to convert block type:', error)
  }
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove, { passive: true })
  document.addEventListener('click', handleDocumentClick)
  
  // 添加拖拽事件监听
  const editorContent = document.querySelector('.ProseMirror')
  if (editorContent) {
    editorContent.addEventListener('dragover', handleDragOver as any)
    editorContent.addEventListener('drop', handleDrop as any)
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('click', handleDocumentClick)
  
  // 移除拖拽事件监听
  const editorContent = document.querySelector('.ProseMirror')
  if (editorContent) {
    editorContent.removeEventListener('dragover', handleDragOver as any)
    editorContent.removeEventListener('drop', handleDrop as any)
  }
  
  if (hoverTimer.value) {
    window.clearTimeout(hoverTimer.value)
    hoverTimer.value = null
    hoveredBlock.value = null
  }
  pinnedElement.value = null
})

// 全局点击处理：在点击页面的编辑器/手柄/菜单外部时关闭菜单
const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null
  if (!target) return

  // 如果点击在编辑器内部、拖拽手柄或块菜单内，不关闭
  const editorContent = document.querySelector('.ProseMirror')
  if (editorContent && editorContent.contains(target)) return
  if (target.closest('.drag-handle')) return
  if (target.closest('.block-action-menu')) return

  // 否则关闭菜单
  showMenu.value = false
  menuDraggedElement.value = null
}
</script>

<template>
  <div class="drag-handle-container">
    <!-- 浮动拖拽手柄 -->
    <Teleport to="body">
      <!-- 当菜单打开时，显示手柄为小灰点；菜单关闭时，显示手柄在鼠标位置 -->
      <div 
        v-if="(showMenu && menuDraggedElement) || (handlePosition && !showMenu)"
        class="drag-handle"
        :class="{ 'drag-handle--menu-open': showMenu, 'drag-handle--dragging': isDragging }"
        :style="{
          position: 'fixed',
          left: handlePosition?.x + 'px',
          top: handlePosition?.y + 'px',
          zIndex: 100,
          width: showMenu ? '8px' : ((handleWidth || 28) + 'px'),
          height: showMenu ? '8px' : ((handleHeight ? handleHeight + 'px' : (minHandleHeight || 24) + 'px')),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }"
        draggable="true"
        @dragstart="handleDragStart"
        @dragend="handleDragEnd"
        @click="handleDragHandleClick"
        title="拖拽移动块或点击打开菜单"
      >
        <GripVertical v-if="!showMenu" class="w-4 h-4 text-gray-400 hover:text-gray-600" />
      </div>

      <!-- 块操作菜单 - 打开后保持显示，直到用户主动关闭 -->
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
.drag-handle {
  cursor: grab;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  &:active {
    cursor: grabbing;
  }

  &.drag-handle--menu-open {
    width: 8px !important;
    height: 8px !important;
    border-radius: 50%;
    background-color: #d1d5db;
    padding: 0;
    cursor: auto;

    &:hover {
      background-color: #9ca3af;
    }
  }

  &.drag-handle--dragging {
    cursor: grabbing;
    opacity: 0.8;
    background-color: rgba(59, 130, 246, 0.2);
  }
}

:global(.dragging) {
  opacity: 0.5 !important;
  background-color: rgba(59, 130, 246, 0.1) !important;
}

:global(.drag-over-top) {
  border-top: 2px solid #3b82f6 !important;
}

:global(.drag-over-bottom) {
  border-bottom: 2px solid #3b82f6 !important;
}
</style>

