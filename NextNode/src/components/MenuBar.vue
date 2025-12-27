<!-- src/components/MenuBar.vue -->
<script setup>
import { 
  Bold, Italic, Strikethrough, Code, 
  Heading1, Heading2, Heading3, 
  List, ListOrdered, CheckSquare, 
  Quote, Code2, 
  Undo, Redo, Minus, 
  Underline
} from 'lucide-vue-next'

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
})

// 定义菜单按钮配置数组
const items = [
  {
    icon: Bold,
    title: 'Bold',
    action: () => props.editor.chain().focus().toggleBold().run(),
    isActive: () => props.editor.isActive('bold'),
  },
  {
    icon: Italic,
    title: 'Italic',
    action: () => props.editor.chain().focus().toggleItalic().run(),
    isActive: () => props.editor.isActive('italic'),
  },
  {
    icon: Strikethrough,
    title: 'Strike',
    action: () => props.editor.chain().focus().toggleStrike().run(),
    isActive: () => props.editor.isActive('strike'),
  },
  {
    icon: Code,
    title: 'Code',
    action: () => props.editor.chain().focus().toggleCode().run(),
    isActive: () => props.editor.isActive('code'),
  },
  {
    icon: Underline,
    title: 'Underline',
    action: () => props.editor.chain().focus().toggleUnderline().run(),
    isActive: () => props.editor.isActive('Underline'),
  },
  {
    type: 'divider', // 分割线
  },
  {
    icon: Heading1,
    title: 'H1',
    action: () => props.editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: () => props.editor.isActive('heading', { level: 1 }),
  },
  {
    icon: Heading2,
    title: 'H2',
    action: () => props.editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: () => props.editor.isActive('heading', { level: 2 }),
  },
  {
    icon: Heading3,
    title: 'H3',
    action: () => props.editor.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: () => props.editor.isActive('heading', { level: 3 }),
  },
  {
    type: 'divider',
  },
  {
    icon: List,
    title: 'Bullet List',
    action: () => props.editor.chain().focus().toggleBulletList().run(),
    isActive: () => props.editor.isActive('bulletList'),
  },
  {
    icon: ListOrdered,
    title: 'Ordered List',
    action: () => props.editor.chain().focus().toggleOrderedList().run(),
    isActive: () => props.editor.isActive('orderedList'),
  },
  {
    icon: CheckSquare,
    title: 'Task List',
    action: () => props.editor.chain().focus().toggleTaskList().run(),
    isActive: () => props.editor.isActive('taskList'),
  },
  {
    type: 'divider',
  },
  {
    icon: Quote,
    title: 'Blockquote',
    action: () => props.editor.chain().focus().toggleBlockquote().run(),
    isActive: () => props.editor.isActive('blockquote'),
  },
  {
    icon: Minus, // 水平分割线
    title: 'Horizontal Rule',
    action: () => props.editor.chain().focus().setHorizontalRule().run(),
  },
  {
    type: 'divider',
  },
  {
    icon: Undo,
    title: 'Undo',
    action: () => props.editor.chain().focus().undo().run(),
    disabled: () => !props.editor.can().chain().focus().undo().run(), // 不可点击时禁用
  },
  {
    icon: Redo,
    title: 'Redo',
    action: () => props.editor.chain().focus().redo().run(),
    disabled: () => !props.editor.can().chain().focus().redo().run(),
  },
]
</script>

<template>
  <div class="menu-bar">
    <template v-for="(item, index) in items" :key="index">
      
      <!-- 如果是分割线 -->
      <div v-if="item.type === 'divider'" class="divider" />
      
      <!-- 如果是普通按钮 -->
      <button
        v-else
        class="menu-item"
        :class="{ 
          'is-active': item.isActive ? item.isActive() : false,
          'is-disabled': item.disabled ? item.disabled() : false 
        }"
        @click="item.action"
        :title="item.title"
        :disabled="item.disabled ? item.disabled() : false"
      >
        <!-- 动态渲染 Lucide 图标 -->
        <component :is="item.icon" :size="18" />
      </button>

    </template>
  </div>
</template>

<style scoped>
.menu-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  position: sticky; /* 吸顶效果 */
  top: 0;
  z-index: 10;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  background: transparent;
  color: #6b7280;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.menu-item:hover {
  background-color: #f3f4f6;
  color: #111827;
}

/* 激活状态 (黑底白字，像 Notion) */
.menu-item.is-active {
  background-color: #000;
  color: #fff;
}

.menu-item.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.divider {
  width: 1px;
  height: 1.25rem;
  background-color: #e5e7eb;
  margin: 0 0.25rem;
}
</style>