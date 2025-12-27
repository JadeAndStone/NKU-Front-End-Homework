<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { useTreeStore } from '@/stores/tree' 
import { useDebounceFn } from '@vueuse/core'
import Editor from '@/components/Editor.vue'

const route = useRoute()
const documentStore = useDocumentStore()
const treeStore = useTreeStore() 

const isLoading = ref(true)
const pageTitle = ref('')
// Tiptap 的初始内容
const editorContent = ref({ type: 'doc', content: [] }) 
// 我们只操作根 Block
const rootBlockId = ref<string | null>(null)

const currentId = computed(() => route.params.id as string)

// 1. 加载文档
async function loadData() {
  if (!currentId.value) return
  
  isLoading.value = true
  try {
    // 队友的 Store 方法：加载文档
    await documentStore.loadDocument(currentId.value)
    
    // 获取当前页面的标题
    if (documentStore.currentPage) {
      pageTitle.value = documentStore.currentPage.title
    }

    // 获取根 Block (作为我们编辑器的容器)
    // 队友的逻辑里，loadDocument 完会自动计算 rootBlockId
    const rootId = documentStore.rootBlockId
    if (rootId) {
      rootBlockId.value = rootId
      const block = documentStore.getBlock(rootId)
      if (block && block.content) {
        // 🔥 核心对接：把 Block 里的 content 喂给编辑器
        editorContent.value = block.content
      }
    }
  } catch (error) {
    console.error('加载文档失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 2. 自动保存内容 (防抖 1秒)
const handleContentUpdate = useDebounceFn(async (newContent) => {
  if (!rootBlockId.value) return
  
  console.log('自动保存内容...', rootBlockId.value)
  // 调用队友的 updateBlock 方法
  await documentStore.updateBlock(rootBlockId.value, {
    content: newContent
  })
}, 1000)

// 3. 自动保存标题
const handleTitleUpdate = useDebounceFn(async () => {
  if (!currentId.value) return
  console.log('自动保存标题...', pageTitle.value)
  
  // 动作 A: 更新当前文档元数据 (保证右侧正确)
  await documentStore.updatePageMetadata({
    title: pageTitle.value
  })

  // 动作 B: 🔥 核心修复 - 同步更新侧边栏树的数据 (保证左侧正确)
  // 队友在 tree.ts 里写了 updatePage 方法，会同时更新本地状态和数据库
  await treeStore.updatePage(currentId.value, {
    title: pageTitle.value
  })
}, 500) // 建议把时间改成 500ms，标题响应快一点体验更好

// 监听路由变化
watch(currentId, () => {
  loadData()
}, { immediate: true })

</script>

<template>
  <div class="page-container">
    <div v-if="isLoading" class="loading">加载中...</div>
    
    <div v-else class="editor-layout">
      <!-- 标题区 -->
      <div class="doc-header">
        <input 
          v-model="pageTitle" 
          @input="handleTitleUpdate" 
          class="title-input" 
          placeholder="无标题"
        >
      </div>

      <!-- 编辑器核心 -->
      <Editor 
        v-model="editorContent"
        @update:modelValue="handleContentUpdate"
      />
    </div>
  </div>
</template>

<style scoped>
.page-container {
  height: 100%;
  overflow-y: auto;
  padding: 40px 60px;
}

.title-input {
  font-size: 40px;
  font-weight: 700;
  border: none;
  outline: none;
  width: 100%;
  margin-bottom: 20px;
  color: #37352f;
  background: transparent;
}

.title-input::placeholder {
  color: #e5e5e5;
}

.loading {
  padding: 50px;
  text-align: center;
  color: #999;
}
</style>