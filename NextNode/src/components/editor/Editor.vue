<script setup lang="ts">
// @ts-nocheck
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import MenuBar from './MenuBar.vue'
import DragHandle from './DragHandle.vue'

import SlashCommand from '@/extensions/SlashCommand.js'
import Calendar from '@/extensions/Calendar.js'
import Kanban from '@/extensions/Kanban.js'
import suggestion from '@/utils/suggestion.js'
import EditorBubbleMenu from './EditorBubbleMenu.vue'

import ExtensionBubbleMenu from '@tiptap/extension-bubble-menu'
import DragHandleExtension from '@tiptap/extension-drag-handle'
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
    DragHandleExtension.configure({
      dragHandleWidth: 20
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
    <EditorBubbleMenu v-if="editor && editable" :editor="editor" />
    <DragHandle v-if="editor && editable" :editor="editor" />
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
}

.ProseMirror {
  padding: 20px;
  outline: none;
  min-height: 200px;
}
</style>