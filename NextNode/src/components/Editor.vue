<script setup>
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import MenuBar from './MenuBar.vue'

// 1. 注意这里：引入的是我们刚才新建的 SlashCommand.js，而不是 @tiptap/suggestion
import SlashCommand from '../extensions/SlashCommand.js'

// 2. 引入你的菜单配置逻辑
import suggestion from '../utils/suggestion.js'

import EditorBubbleMenu from './EditorBubbleMenu.vue'

import ExtensionBubbleMenu from '@tiptap/extension-bubble-menu' 
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import Image from '@tiptap/extension-image'
import { Underline } from 'lucide-vue-next'

import { watch, onBeforeUnmount } from 'vue'

// 2. 创建高亮实例 (注册常用的语言)
const lowlight = createLowlight(common)

const props = defineProps({
  modelValue: {
    type: Object, // 接收 JSON 对象
    default: () => ({ type: 'doc', content: [] }),
  },
  editable: {
    type: Boolean,
    default: true,
  }
})

const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  // content: '<p>试着输入斜杠 / 看看效果...</p>',
  content: props.modelValue, // 初始化内容
  editable: props.editable,
  extensions: [
    SlashCommand.configure({ suggestion }),
    StarterKit.configure({
      codeBlock: false, // 禁用默认的低配版
    }),

    CodeBlockLowlight.configure({
      lowlight,
    }),
    // 2. 注册它！如果不注册，Vue组件不知道该监听谁
    ExtensionBubbleMenu.configure({
      pluginKey: 'bubbleMenu', // 必填，用来定位插件
    }),
    
    TaskList,
    TaskItem.configure({
      nested: true, // 支持嵌套 (Tab 键缩进)
    }),
    Image,
    Underline,
  ],
  onUpdate: ({ editor }) => {
    // 只有当内容真的变了才触发
    emit('update:modelValue', editor.getJSON())
  },
})

watch(() => props.modelValue, (newValue) => {
  // 如果编辑器实例存在，且新内容和当前内容不一样
  if (editor.value && JSON.stringify(editor.value.getJSON()) !== JSON.stringify(newValue)) {
    editor.value.commands.setContent(newValue, false) // false 表示不触发 update 事件
  }
})

// 销毁防泄漏
onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="editor-wrapper">
    <!-- 加上 v-if 保护 -->
    <MenuBar v-if="editor && editable" :editor="editor" />
    <EditorBubbleMenu v-if="editor && editable" :editor="editor" />
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