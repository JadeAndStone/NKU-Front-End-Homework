<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Copy, Trash2, Type, ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  position: {
    type: Object as () => { x: number; y: number },
    required: true,
  },
  blockElement: {
    type: Object as () => HTMLElement | null,
    default: null,
  },
  blockType: {
    type: String,
    default: 'text',
  }
})

const emit = defineEmits(['action', 'close'])

// 判断是否显示转换类型选项
const shouldShowConvertType = computed(() => {
  const nonConvertibleTypes = ['image', 'calendar', 'kanban', 'codeBlock', 'custom', 'unknown']
  return !nonConvertibleTypes.includes(props.blockType)
})

// 是否展开类型转换菜单
const showTypeMenu = ref(false)

// 块类型选项
const blockTypes = [
  { value: 'paragraph', label: '段落' },
  { value: 'heading_1', label: '标题 1' },
  { value: 'heading_2', label: '标题 2' },
  { value: 'heading_3', label: '标题 3' },
  { value: 'bulletList', label: '无序列表' },
  { value: 'numberedList', label: '有序列表' },
  { value: 'blockquote', label: '引用块' },
]

// 处理菜单项点击
const handleAction = (action: string) => {
  if (action === 'convertType') {
    showTypeMenu.value = !showTypeMenu.value
  } else {
    emit('action', action)
    emit('close')
  }
}

const handleTypeSelect = (blockType: string) => {
  emit('action', 'convertType', blockType)
  emit('close')
}

// 点击外部关闭菜单 - 仅在点击编辑器内容区域时关闭
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  const menuElement = target.closest('.block-action-menu')
  const handleElement = target.closest('.drag-handle')
  const editorContent = document.querySelector('.ProseMirror')
  
  // 点击菜单本身或手柄时不关闭
  if (menuElement || handleElement) {
    return
  }
  
  // 只在点击编辑器内容区域时关闭菜单
  if (editorContent && editorContent.contains(target)) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div
    class="block-action-menu"
    :style="{
      position: 'fixed',
      left: (position.x - 180) + 'px',
      top: (position.y - 20) + 'px',
      zIndex: 1000,
    }"
  >
    <div class="menu-container">
      <!-- 复制 -->
      <button class="menu-item" @click="handleAction('duplicate')" title="复制块">
        <Copy class="w-4 h-4" />
        <span>复制</span>
      </button>

      <!-- 转换类型 -->
      <div v-if="shouldShowConvertType" class="menu-item-group">
        <button
          class="menu-item"
          @click="handleAction('convertType')"
          title="转换块类型"
        >
          <Type class="w-4 h-4" />
          <span>转换类型</span>
          <ChevronDown
            class="w-4 h-4 ml-auto transition-transform"
            :style="{ transform: showTypeMenu ? 'rotate(180deg)' : '' }"
          />
        </button>

        <!-- 类型子菜单 -->
        <Transition name="expand">
          <div v-if="showTypeMenu" class="submenu">
            <button
              v-for="type in blockTypes"
              :key="type.value"
              class="submenu-item"
              @click="handleTypeSelect(type.value)"
            >
              {{ type.label }}
            </button>
          </div>
        </Transition>
      </div>

      <!-- 删除 -->
      <button class="menu-item menu-item-danger" @click="handleAction('delete')" title="删除块">
        <Trash2 class="w-4 h-4" />
        <span>删除</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.block-action-menu {
  animation: slideIn 0.15s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.menu-container {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  min-width: 160px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  color: #1f2937;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: #f3f4f6;
  }

  &.menu-item-danger {
    color: #ef4444;

    &:hover {
      background-color: #fee2e2;
    }
  }

  svg {
    flex-shrink: 0;
  }
}

.menu-item-group {
  position: relative;

  .menu-item {
    padding-right: 8px;
  }
}

.submenu {
  background-color: #f9fafb;
  border-top: 1px solid #e5e7eb;
  padding: 4px 0;
}

.submenu-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  padding-left: 32px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
  color: #4b5563;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: #f3f4f6;
  }
}

/* 展开/收起动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.15s ease;
  max-height: 300px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
