<template>
  <div class="home-view">
    <div class="container mx-auto p-8">
      <h1 class="text-3xl font-bold mb-6">欢迎使用 NextNote</h1>
      
      <div v-if="treeStore.tree.length === 0" class="empty-state">
        <p class="text-gray-500 mb-4">还没有文档，从左侧侧边栏创建第一个文档吧！</p>
        <p class="text-sm text-gray-400">或者点击侧边栏的 "+ 新建文档" 按钮</p>
      </div>

      <div v-else class="welcome-content">
        <p class="text-gray-600 mb-4">从左侧侧边栏选择文档开始编辑</p>
        <div class="tips">
          <h3 class="text-lg font-semibold mb-2">使用提示：</h3>
          <ul class="list-disc list-inside text-gray-600 space-y-1">
            <li>点击侧边栏的文档名称打开文档</li>
            <li>点击文档旁的 "+ 子文档" 创建子文档</li>
            <li>点击 ▶ 展开查看子文档</li>
          </ul>
        </div>
        <div class="mt-4">
          <button
            @click="clearAllData"
            class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
          >
            清空所有数据（开发用）
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useTreeStore } from '@/stores/tree'
import { dbUtils } from '@/utils/idb'

const treeStore = useTreeStore()

// 确保树数据已加载
onMounted(async () => {
  if (treeStore.pages.size === 0) {
    await treeStore.loadAllPages()
  }
})

// 清空所有数据（开发调试用）
async function clearAllData() {
  if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
    try {
      await dbUtils.clearAll()
      await treeStore.loadAllPages()
      alert('数据已清空，请刷新页面')
      location.reload()
    } catch (error) {
      console.error('清空数据失败:', error)
      alert('清空数据失败: ' + (error as Error).message)
    }
  }
}
</script>

<style scoped>
.home-view {
  min-height: 100vh;
  background: #fff;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
}

.welcome-content {
  max-width: 600px;
}

.tips {
  background: #f7f6f3;
  padding: 24px;
  border-radius: 8px;
  margin-top: 24px;
}
</style>

