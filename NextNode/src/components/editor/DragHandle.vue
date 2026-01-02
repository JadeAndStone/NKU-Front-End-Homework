<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { GripVertical } from 'lucide-vue-next'
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

// 判断块是否包含内容（文本或媒体/自定义节点）
const isBlockNotEmpty = (el: HTMLElement | null) => {
  if (!el) return false
  // 如果是自定义节点（data-type）视为非空
  if (el.hasAttribute && el.hasAttribute('data-type')) return true
  // 包含图片或媒体视为非空
  if (el.querySelector && el.querySelector('img, video, svg, iframe, canvas, [data-type]')) return true
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

  // 找到最近的块元素（段落、标题等）
  let blockElement = target.closest('p, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, li, pre, div[data-type]')
  
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

  // 如果菜单已打开，立即更新菜单绑定到当前块并更新位置
  if (showMenu.value) {
    if (menuDraggedElement.value !== (blockElement as HTMLElement)) {
      menuDraggedElement.value = blockElement as HTMLElement
      menuPosition.value = { x: editorRect.left + 20, y: rect.top + window.scrollY }
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
  const el = (menuDraggedElement.value || draggedElement.value) as HTMLElement | null
  if (!el) {
    // 尝试从事件目标找最近的块元素
    const target = (event.target as HTMLElement)
    const block = target?.closest('p, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, li, pre, div[data-type]') as HTMLElement | null
    if (!block) return
    draggedElement.value = block
  }

  isDragging.value = true
  dragStartPos.value = { x: event.clientX, y: event.clientY }
  
  // 设置拖拽数据
  event.dataTransfer!.effectAllowed = 'move'
  event.dataTransfer!.dropEffect = 'move'
  
  // 创建拖拽图像（半透明）
  const dragImage = draggedElement.value.cloneNode(true) as HTMLElement
  dragImage.style.opacity = '0.6'
  dragImage.style.position = 'absolute'
  dragImage.style.left = '-9999px'
  dragImage.style.top = '-9999px'
  dragImage.style.pointerEvents = 'none'
  document.body.appendChild(dragImage)
  
  event.dataTransfer!.setDragImage(dragImage, 0, 0)
  
  // 清理临时元素
  setTimeout(() => {
    if (document.body.contains(dragImage)) {
      document.body.removeChild(dragImage)
    }
  }, 0)
  
  // 标记当前元素为被拖拽状态 - 创建"幽灵样式"
  const targetEl = (menuDraggedElement.value || draggedElement.value) as HTMLElement | null
  if (targetEl) {
    targetEl.classList.add('dragging')
    targetEl.classList.add('ghost-style')
  }
  // 开始拖拽时取消锁定，避免与后续位置冲突
  pinnedElement.value = null
  
  // 隐藏手柄和菜单
  handlePosition.value = null
  showMenu.value = false
}

const handleDragEnd = () => {
  isDragging.value = false
  dragStartPos.value = null
  dragOffset.value = { x: 0, y: 0 }
  const targetEl = (menuDraggedElement.value || draggedElement.value) as HTMLElement | null
  targetEl?.classList.remove('dragging')
  targetEl?.classList.remove('ghost-style')
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
    
    // 获取该位置的节点信息，确定块的准确大小
    const node = editor.state.doc.nodeAt(pos)
    if (!node) {
      throw new Error('Cannot find node at position')
    }

    // 计算节点的完整大小（包括所有子节点）
    const nodeSize = node.nodeSize
    
    // 删除整个节点
    editor.chain()
      .focus()
      .deleteRange({ from: pos, to: pos + nodeSize })
      .run()
    
    // 添加视觉反馈动画
    element.classList.add('delete-animation')
    
    // 等待动画完成
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        resolve()
      }, 300)

      element.addEventListener('animationend', () => {
        clearTimeout(timer)
        resolve()
      }, { once: true })
    })
  } catch (error) {
    // 如果上面的方式失败，尝试使用 lift/delete 组合方式
    try {
      element.classList.add('delete-animation')
      
      // 使用更激进的删除方式：删除当前行及其所有子元素
      const pos = editor.view.posAtDOM(element, 0)
      const node = editor.state.doc.nodeAt(pos)
      if (node) {
        const nodeSize = node.nodeSize
        editor.chain()
          .focus()
          .setSelection({ from: pos, to: pos + nodeSize })
          .deleteSelection()
          .run()
      }
      
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve()
        }, 300)
      })
    } catch (err) {
      console.error('Error deleting block:', err)
    }
  }
}

// 复制块的具体实现
const duplicateBlock = async () => {
  if (!menuDraggedElement.value || !props.editor) return

  const element = menuDraggedElement.value
  const clone = element.cloneNode(true) as HTMLElement

  // 添加插入动画
  clone.classList.add('insert-animation')
  clone.style.opacity = '0'
  clone.style.transform = 'translateY(-10px)'

  // 在原元素下方插入
  element.insertAdjacentElement('afterend', clone)

  // 触发动画
  await nextTick()
  clone.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
  clone.style.opacity = '1'
  clone.style.transform = 'translateY(0)'
}

// 转换块类型的具体实现
const convertBlockType = (targetType: string) => {
  if (!menuDraggedElement.value || !props.editor) return

  const editor = props.editor
  const element = menuDraggedElement.value

  // 获取块在编辑器中的位置
  const editorContent = document.querySelector('.ProseMirror')
  if (!editorContent) return

  // 找到块对应的编辑器节点位置
  let node = element
  while (node && node !== editorContent) {
    const offset = Array.from(node.parentElement?.children || []).indexOf(node as any)
    if (offset === 0) {
      break
    }
    node = node.parentElement as HTMLElement
  }

  // 执行类型转换
  const typeMap: Record<string, () => void> = {
    paragraph: () => editor.chain().focus().setParagraph().run(),
    heading_1: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    heading_2: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    heading_3: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    bulletList: () => editor.chain().focus().toggleBulletList().run(),
    numberedList: () => editor.chain().focus().toggleOrderedList().run(),
    blockquote: () => editor.chain().focus().toggleBlockquote().run(),
  }

  typeMap[targetType]?.()
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove, { passive: true })
  // 点击页面任意位置以外部区域时关闭菜单
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
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
      <!-- 当菜单打开时，显示手柄在菜单对应的位置；菜单关闭时，显示手柄在鼠标位置 -->
      <div 
        v-if="(showMenu && menuDraggedElement) || (handlePosition && !isDragging && !showMenu)"
        class="drag-handle"
        :style="{
          position: 'fixed',
          left: (showMenu && menuPosition ? menuPosition.x + 20 : handlePosition?.x) + 'px',
          top: (showMenu && menuPosition ? menuPosition.y + 8 : handlePosition?.y) + 'px',
          zIndex: 100,
          width: (handleWidth || 28) + 'px',
          height: (handleHeight ? handleHeight + 'px' : (minHandleHeight || 24) + 'px'),
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
        <GripVertical class="w-4 h-4 text-gray-400 hover:text-gray-600" />
      </div>

      <!-- 块操作菜单 - 打开后保持显示，直到用户主动关闭 -->
      <BlockActionMenu
        v-if="showMenu && menuPosition"
        :position="menuPosition"
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
}

:global(.dragging) {
  opacity: 0.5 !important;
  background-color: rgba(59, 130, 246, 0.1) !important;
}
</style>

