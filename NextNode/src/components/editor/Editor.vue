<script setup lang="ts">
// @ts-nocheck
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import MenuBar from './MenuBar.vue'
import DragHandleMenu from './DragHandle.vue'
import { DragHandle } from '@tiptap/extension-drag-handle-vue-3'

import SlashCommand from '@/extensions/SlashCommand.js'
import Calendar from '@/extensions/Calendar.js'
import Kanban from '@/extensions/Kanban.js'
import suggestion from '@/utils/suggestion.js'
import EditorBubbleMenu from './EditorBubbleMenu.vue'

import ExtensionBubbleMenu from '@tiptap/extension-bubble-menu'
import DropCursor from '@tiptap/extension-dropcursor'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'

import { watch, onBeforeUnmount } from 'vue'

const lowlight = createLowlight(common)

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ type: 'doc', content: [] })
  },
  editable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'mounted'])

const editor = useEditor({
  content: JSON.parse(JSON.stringify(props.modelValue)),
  editable: props.editable,
  extensions: [
    Calendar,
    Kanban,
    SlashCommand.configure({ suggestion }),
    StarterKit.configure({
      codeBlock: false
    }),
    CodeBlockLowlight.configure({
      lowlight
    }),
    ExtensionBubbleMenu.configure({
      pluginKey: 'bubbleMenu'
    }),
    DropCursor.configure({
      width: 2,
      class: 'drop-cursor',
      color: '#3b82f6'
    }),
    TaskList,
    TaskItem.configure({
      nested: true
    }),
    Image,
    Placeholder.configure({
      placeholder: '输入斜杠 / 可插入模块...',
      emptyEditorClass: 'is-editor-empty'
    })
  ],
  onUpdate: (ctx: any) => {
    emit('update:modelValue', ctx.editor.getJSON())
  }
})

const handleWatchEditor = (newEditor: any) => {
  if (newEditor) {
    emit('mounted', newEditor)
  }
}

const handleWatchModelValue = (newValue: any) => {
  if (editor.value && JSON.stringify(editor.value.getJSON()) !== JSON.stringify(newValue)) {
    editor.value.commands.setContent(newValue as any, false)
  }
}

watch(() => editor.value, handleWatchEditor);
watch(() => props.modelValue, handleWatchModelValue);

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<template>
  <div class="editor-wrapper">
    <MenuBar v-if="editor && editable" :editor="editor" />
    <div class="editor-title-divider"></div> <!-- 新增分割线 -->
    <EditorBubbleMenu v-if="editor && editable" :editor="editor" />
    <!-- 使用官方 DragHandle 组件处理拖拽，offset: [垂直偏移, 水平偏移] 负数向左移动 -->
    <DragHandle v-if="editor && editable" :editor="editor" :tippyOptions="{ offset: [0, 16], zIndex: 99, placement: 'left-start' }">
      <div class="custom-drag-handle">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="12" r="1"></circle>
          <circle cx="9" cy="5" r="1"></circle>
          <circle cx="9" cy="19" r="1"></circle>
          <circle cx="15" cy="12" r="1"></circle>
          <circle cx="15" cy="5" r="1"></circle>
          <circle cx="15" cy="19" r="1"></circle>
        </svg>
      </div>
    </DragHandle>
    <!-- 自定义菜单组件保留原有功能 -->
    <DragHandleMenu v-if="editor && editable" :editor="editor" />
    <editor-content :editor="editor" />
  </div>
</template>

<style>
.editor-wrapper {
  border: 1px solid #ddd;
  border-radius: 8px;
  min-height: 300px;
  max-width: 800px;
  margin: 20px auto;
  background: white;
  transition: max-width 0.3s ease;
}

/* 侧边栏折叠时编辑器扩大 */
.sidebar-collapsed .editor-wrapper {
  max-width: 1000px;
}

.ProseMirror {
  padding: 20px;
  outline: none;
  min-height: 200px;
}

/* 官方 DragHandle 样式 */
.custom-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: grab;
  color: #9ca3af;
  transition: all 0.15s ease;
}

.custom-drag-handle:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #6b7280;
}

.custom-drag-handle:active {
  cursor: grabbing;
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

/* DropCursor 样式 */
.drop-cursor {
  border-color: #3b82f6 !important;
}

/* 新增分割线样式 */
.editor-title-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 0 0 16px 0;
  width: 100%;
}
</style>