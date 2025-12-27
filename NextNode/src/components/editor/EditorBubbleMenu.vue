<!-- src/components/EditorBubbleMenu.vue -->
<script setup>
import { BubbleMenu } from '@tiptap/vue-3/menus' // 👈 记得确认路径是 menus 还是 dist
import { 
  Bold, Italic, Strikethrough, Code, 
  Heading1, Heading2, TextQuote,
  Underline
} from 'lucide-vue-next'

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
})

// 气泡菜单只需要最常用的
const items = [
  {
    icon: Bold,
    action: () => props.editor.chain().focus().toggleBold().run(),
    isActive: () => props.editor.isActive('bold'),
  },
  {
    icon: Italic,
    action: () => props.editor.chain().focus().toggleItalic().run(),
    isActive: () => props.editor.isActive('italic'),
  },
  {
    icon: Strikethrough,
    action: () => props.editor.chain().focus().toggleStrike().run(),
    isActive: () => props.editor.isActive('strike'),
  },
  {
    icon: Code,
    action: () => props.editor.chain().focus().toggleCode().run(),
    isActive: () => props.editor.isActive('code'),
  },
  {
    icon: Underline,
    action: () => props.editor.chain().focus().toggleUnderline().run(),
    isActive: () => props.editor.isActive('underline'),
  },
  {
    type: 'divider',
  },
  {
    icon: Heading1, // 快速变标题
    action: () => props.editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: () => props.editor.isActive('heading', { level: 1 }),
  },
  {
    icon: Heading2,
    action: () => props.editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: () => props.editor.isActive('heading', { level: 2 }),
  },
  {
    icon: TextQuote, // 快速变引用
    action: () => props.editor.chain().focus().toggleBlockquote().run(),
    isActive: () => props.editor.isActive('blockquote'),
  },
]
</script>

<template>
  <bubble-menu
    v-if="editor"
    :editor="editor"
    :tippy-options="{ duration: 100, maxWidth: 400 }"
    class="bubble-menu"
  >
    <template v-for="(item, index) in items" :key="index">
      
      <div v-if="item.type === 'divider'" class="divider" />
      
      <button
        v-else
        class="bubble-item"
        :class="{ 'is-active': item.isActive() }"
        @click="item.action"
      >
        <component :is="item.icon" :size="16" />
      </button>

    </template>
  </bubble-menu>
</template>

<style scoped>
.bubble-menu {
  display: flex;
  align-items: center;
  background-color: #202020; /* 深黑背景 */
  padding: 0.25rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
}

.bubble-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: none;
  color: #a3a3a3; /* 浅灰文字 */
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.bubble-item:hover {
  background-color: #404040;
  color: #fff;
}

/* 激活状态：变成蓝色高亮，或者白色 */
.bubble-item.is-active {
  color: #60a5fa; /* Tailwind blue-400 */
  background-color: #303030;
}

.divider {
  width: 1px;
  height: 1rem;
  background-color: #404040;
  margin: 0 0.25rem;
}
</style>