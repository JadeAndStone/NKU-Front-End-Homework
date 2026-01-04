<template>
  <div class="page-view">
    <div v-if="documentStore.currentPage" class="page-container">
      <!-- Debug: {{ documentStore.currentPage.id }} -->
      <div class="page-header">
        <input
          v-model="title"
          @blur="updateTitle"
          class="title-input"
          placeholder="未命名文档"
        />
      </div>
      
      <div class="page-content">
        <!-- Block 操作按钮 - 移到右侧浮动 -->
        <div class="block-actions">
          <button
            @click="addBlock('paragraph')"
            class="action-btn"
            title="添加段落"
          >
            <span class="btn-icon">📝</span>
            <span class="btn-text">段落</span>
          </button>
          <button
            @click="addBlock('heading_1')"
            class="action-btn"
            title="添加一级标题"
          >
            <span class="btn-icon">H1</span>
            <span class="btn-text">标题1</span>
          </button>
          <button
            @click="addBlock('heading_2')"
            class="action-btn"
            title="添加二级标题"
          >
            <span class="btn-icon">H2</span>
            <span class="btn-text">标题2</span>
          </button>
          <button
            @click="addBlock('code')"
            class="action-btn"
            title="添加代码块"
          >
            <span class="btn-icon">{ }</span>
            <span class="btn-text">代码块</span>
          </button>
        </div>

        <!-- Block 列表 -->
        <div class="blocks-list">
          <!-- Debug: blocksList.length = {{ blocksList.length }}, blocks.size = {{ documentStore.blocks?.size || 0 }} -->
          <div v-if="blocksList.length > 0">
            <div
              v-for="block in blocksList"
              :key="block.id"
              class="block-item mb-4 p-4 border border-gray-200 rounded bg-white"
            >
              <div class="block-header mb-2 flex items-center justify-between pb-2 border-b border-gray-200">
                <span class="text-xs text-gray-500 font-mono">
                  {{ block.type }} (ID: {{ block.id.substring(0, 8) }}...)
                </span>
                <button
                  @click="deleteBlock(block.id)"
                  class="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded border border-red-200 transition-colors"
                  style="background-color: #fee2e2; border: 1px solid #fecaca; color: #dc2626;"
                >
                  删除
                </button>
              </div>
              <div class="block-content text-gray-700 mt-2">
                <pre v-if="block.type === 'code'" class="bg-gray-100 p-2 rounded text-sm overflow-x-auto">{{ JSON.stringify(block.content, null, 2) }}</pre>
                <div v-else class="text-sm">{{ JSON.stringify(block.content) }}</div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <p v-if="documentStore.blocks && documentStore.blocks.size > 0" class="text-gray-500">
              没有根级别的 Block（所有 Block 都有父节点）
              <br>blocks数量: {{ documentStore.blocks.size }}, blocksList长度: {{ blocksList.length }}
            </p>
            <p v-else class="text-gray-400">
              文档为空，正在创建默认 Block...
            </p>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="loading">
      <p>加载中... (currentPage: {{ currentPageId }})</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useDocumentStore } from '@/stores/document'
import { BlockType } from '@/types'

const documentStore = useDocumentStore()

const title = ref('')

const currentPageId = computed(() => documentStore.currentPage?.id ?? 'null')

// 监听页面变化，更新标题
watch(
  () => documentStore.currentPage,
  (page) => {
    if (page) {
      title.value = page.title
    }
  },
  { immediate: true }
)

// 获取所有 Blocks 列表（用于显示）
const blocksList = computed(() => {
  if (!documentStore.blocks || documentStore.blocks.size === 0) {
    return []
  }
  const rootBlocks = Array.from(documentStore.blocks.values())
    .filter(block => block.parentId === null) // 只显示根级别的 Block
    .sort((a, b) => a.order - b.order)
  return rootBlocks
})

async function updateTitle() {
  if (title.value.trim() && documentStore.currentPage) {
    await documentStore.updatePageMetadata({ title: title.value.trim() })
  }
}

async function addBlock(type: string) {
  try {
    if (!documentStore.currentPage) {
      console.error('当前没有打开的文档')
      return
    }
    
    let blockType: BlockType
    switch (type) {
      case 'paragraph':
        blockType = BlockType.PARAGRAPH
        break
      case 'heading_1':
        blockType = BlockType.HEADING_1
        break
      case 'heading_2':
        blockType = BlockType.HEADING_2
        break
      case 'code':
        blockType = BlockType.CODE
        break
      default:
        blockType = BlockType.PARAGRAPH
    }
    
    const newBlock = await documentStore.addBlock(blockType, null)
    console.log('Block 创建成功:', newBlock.id)
    console.log('当前 blocks 数量:', documentStore.blocks.size)
    console.log('blocksList 数量:', blocksList.value.length)
  } catch (error) {
    console.error('创建 Block 失败:', error)
    alert('创建 Block 失败: ' + (error as Error).message)
  }
}

async function deleteBlock(blockId: string) {
  if (confirm('确定要删除这个 Block 吗？')) {
    try {
      await documentStore.deleteBlock(blockId)
      console.log('Block 删除成功')
    } catch (error) {
      console.error('删除 Block 失败:', error)
      alert('删除 Block 失败: ' + (error as Error).message)
    }
  }
}
</script>

<style scoped>
.page-view {
  min-height: 100vh;
  background: #fff;
}

.page-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 48px 24px;
  position: relative;
}

.page-header {
  margin-bottom: 48px;
}

.title-input {
  font-size: 42px;
  font-weight: 700;
  border: none;
  outline: none;
  width: 100%;
  padding: 12px 0;
  color: #37352f;
  background: transparent;
}

.title-input:focus {
  border-bottom: 2px solid #e1e1e1;
}

.title-input::placeholder {
  color: #9b9a97;
}

.page-content {
  min-height: 400px;
  position: relative;
}

.block-actions {
  position: fixed;
  right: 32px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 10;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e1e1e1;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  font-size: 14px;
  font-weight: 500;
  color: #37352f;
  min-width: 120px;
}

.action-btn:hover {
  background: #f7f6f3;
  border-color: #d1d1d0;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateX(-2px);
}

.action-btn:active {
  transform: translateX(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.btn-icon {
  font-size: 16px;
  font-weight: 600;
  color: #787774;
}

.btn-text {
  color: #37352f;
}

.blocks-list {
  min-height: 200px;
  padding-right: 160px; /* 为右侧按钮留出空间 */
}

.block-item {
  background: #fff;
  transition: all 0.2s;
}

.block-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.block-header {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
}

.block-content {
  margin-top: 8px;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #6b7280;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
</style>

