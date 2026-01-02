<script setup lang="ts">
/**
 * 编辑器包装组件
 * 集成拖拽、动画、块操作等功能
 */
import { ref } from 'vue'
import { TransitionGroup } from 'vue'
import Editor from './Editor.vue'
import DragHandle from './DragHandle.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ type: 'doc', content: [] }),
  },
  editable: {
    type: Boolean,
    default: true,
  }
})

const emit = defineEmits(['update:modelValue'])

// 存储editor实例
const editorInstance = ref(null)

// 处理编辑器更新
const handleEditorUpdate = (value: any) => {
  emit('update:modelValue', value)
}

// 处理拖拽操作
const handleBlockAction = ({ action, blockType }: any) => {
  console.log('Block action:', action, blockType)
  // 这里可以添加额外的逻辑，如埋点、日志等
}

// 捕获editor实例
const onEditorMounted = (editor: any) => {
  editorInstance.value = editor
}
</script>

<template>
  <div class="editor-wrapper-container">
    <!-- 编辑器 -->
    <Editor
      :model-value="modelValue"
      :editable="editable"
      @update:model-value="handleEditorUpdate"
      @mounted="onEditorMounted"
    />

    <!-- 拖拽手柄（只在可编辑时显示） -->
    <DragHandle
      v-if="editable && editorInstance"
      :editor="editorInstance"
      @action="handleBlockAction"
    />
  </div>
</template>

<style scoped>
.editor-wrapper-container {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
