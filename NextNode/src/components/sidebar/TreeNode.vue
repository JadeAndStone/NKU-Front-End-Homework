<template>
  <div class="tree-node">
    <div
      class="document-item"
      :style="{ paddingLeft: (level * 20 + 20) + 'px', paddingRight: '20px' }"
      @click="$emit('open', node.id)"
    >
      <span v-if="hasChildren" class="expand-icon" @click.stop="toggleExpand" title="点击展开/折叠">
        {{ isExpanded ? '▼' : '▶' }}
      </span>
      <span v-else class="expand-placeholder" style="width: 16px; display: inline-block;"></span>
      <span v-if="node.emoji" class="emoji">{{ node.emoji }}</span>
      <span class="title">{{ node.title }}</span>
      <span class="page-info">({{ node.metadata.childrenIds.length }} 个子文档)</span>
      <button
        @click.stop="createChild"
        class="create-child-btn ml-2"
        title="创建子文档"
      >
        + 子文档
      </button>
      <button
        @click.stop="deletePage"
        class="delete-page-btn ml-2"
        title="删除文档"
      >
        删除
      </button>
    </div>
    
    <div v-if="hasChildren && isExpanded" class="children">
          <TreeNode
            v-for="child in node.children"
            :key="child.id"
            :node="child"
            :level="level + 1"
            @open="$emit('open', $event)"
            @create-child="$emit('create-child', $event)"
            @delete="$emit('delete', $event)"
          />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTreeStore } from '@/stores/tree.ts'
import type { TreeNode as TreeNodeType } from '@/types'
import TreeNode from './TreeNode.vue'

const props = defineProps<{
  node: TreeNodeType
  level: number
}>()

const emit = defineEmits<{
  open: [pageId: string]
  'create-child': [parentId: string]
  'delete': [pageId: string]
}>()

const treeStore = useTreeStore()

// 判断是否有子文档：使用 metadata.childrenIds 更准确
const hasChildren = computed(() => props.node.metadata.childrenIds.length > 0)

const isExpanded = computed(() => treeStore.isExpanded(props.node.id))

function toggleExpand() {
  treeStore.toggleExpand(props.node.id)
}

function createChild() {
  emit('create-child', props.node.id)
}

function deletePage() {
  if (confirm(`确定要删除文档"${props.node.title}"吗？此操作会同时删除所有子文档，不可恢复！`)) {
    emit('delete', props.node.id)
  }
}
</script>

<style scoped>
.tree-node {
  width: 100%;
}

.document-item {
  padding: 12px 20px 12px 0;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
}

.document-item:hover {
  background: #f5f5f5;
}

.expand-icon {
  width: 16px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  user-select: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.expand-placeholder {
  width: 16px;
}

.emoji {
  font-size: 20px;
}

.title {
  font-size: 16px;
  flex: 1;
}

.page-info {
  font-size: 12px;
  color: #999;
}

.create-child-btn {
  padding: 4px 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  opacity: 1;
  transition: background 0.2s;
  white-space: nowrap;
}

.create-child-btn:hover {
  background: #2563eb;
}

.delete-page-btn {
  padding: 4px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  opacity: 1;
  transition: background 0.2s;
  white-space: nowrap;
}

.delete-page-btn:hover {
  background: #dc2626;
}

.children {
  margin-left: 0;
}
</style>
