<script setup>
import { NodeViewWrapper } from '@tiptap/vue-3'
import { computed, ref, nextTick } from 'vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  updateAttributes: {
    type: Function,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
})

// 数据获取
const columns = computed(() => props.node.attrs.columns || [])
const tasks = computed(() => props.node.attrs.tasks || [])

// 拖拽状态
const draggedTask = ref(null)
const draggedColumn = ref(null)

// 正在编辑的状态
const addingTaskColumnId = ref(null) // 正在哪一列添加任务
const newTaskContent = ref('')
const addingColumn = ref(false) // 是否正在添加新列
const newColumnTitle = ref('')
const inputRef = ref(null)

// 编辑列标题状态
const editingColumnId = ref(null)
const tempColumnTitle = ref('')
const columnTitleInputRef = ref(null)

// 任务按列分组
const getTasksByColumn = (columnId) => {
  return tasks.value.filter(task => task.columnId === columnId)
}

// 拖拽任务开始
const onTaskDragStart = (e, task) => {
  draggedTask.value = task
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', task.id)
  e.target.style.opacity = '0.5'
}

// 拖拽任务结束
const onTaskDragEnd = (e) => {
  e.target.style.opacity = '1'
  draggedTask.value = null
}

// 拖拽任务进入目标任务（用于列内排序）
const onTaskDrop = (e, targetTask) => {
  e.preventDefault()
  e.stopPropagation() // 防止冒泡到列的 drop 事件
  
  const draggedId = draggedTask.value?.id
  if (!draggedId || draggedId === targetTask.id) return

  // 复制现有任务列表
  let newTasks = [...tasks.value]
  
  // 找到被拖拽任务和目标任务的索引
  const draggedIndex = newTasks.findIndex(t => t.id === draggedId)
  const targetIndex = newTasks.findIndex(t => t.id === targetTask.id)
  
  if (draggedIndex === -1 || targetIndex === -1) return

  // 更新被拖拽任务的 columnId 为目标任务的 columnId
  newTasks[draggedIndex] = { ...newTasks[draggedIndex], columnId: targetTask.columnId }
  
  // 移动任务：先移除，再插入
  const [removed] = newTasks.splice(draggedIndex, 1)
  newTasks.splice(targetIndex, 0, removed)

  props.updateAttributes({ tasks: newTasks })
}

// 拖拽任务进入列（用于跨列移动到空白处）
const onColumnDrop = (e, targetColumnId) => {
  // 如果是列拖拽，不处理
  if (draggedColumn.value) {
    onColumnReorderDrop(e, targetColumnId)
    return
  }

  const taskId = draggedTask.value?.id
  if (!taskId) return

  // 如果目标列没有任务，或者拖到了列的底部
  const targetTasks = getTasksByColumn(targetColumnId)
  const draggedTaskObj = tasks.value.find(t => t.id === taskId)
  
  // 如果已经在该列且是最后一个，不做处理
  if (draggedTaskObj.columnId === targetColumnId && 
      tasks.value.indexOf(draggedTaskObj) === tasks.value.length - 1) {
    return
  }

  // 移动到该列末尾
  let newTasks = [...tasks.value]
  const draggedIndex = newTasks.findIndex(t => t.id === taskId)
  if (draggedIndex === -1) return

  // 更新 columnId
  newTasks[draggedIndex] = { ...newTasks[draggedIndex], columnId: targetColumnId }
  
  // 移动到数组末尾（逻辑上相当于该列末尾，因为渲染是按列过滤的）
  // 为了保持其他列顺序不变，我们可以先移除，再 push
  const [removed] = newTasks.splice(draggedIndex, 1)
  newTasks.push(removed)

  props.updateAttributes({ tasks: newTasks })
}

// 拖拽列开始
const onColumnDragStart = (e, col) => {
  draggedColumn.value = col
  e.dataTransfer.effectAllowed = 'move'
  e.target.style.opacity = '0.5'
}

// 拖拽列结束
const onColumnDragEnd = (e) => {
  e.target.style.opacity = '1'
  draggedColumn.value = null
}

// 拖拽列排序
const onColumnReorderDrop = (e, targetColumnId) => {
  const draggedId = draggedColumn.value?.id
  if (!draggedId || draggedId === targetColumnId) return

  const newColumns = [...columns.value]
  const draggedIndex = newColumns.findIndex(c => c.id === draggedId)
  const targetIndex = newColumns.findIndex(c => c.id === targetColumnId)

  if (draggedIndex === -1 || targetIndex === -1) return

  // 移动列
  const [removed] = newColumns.splice(draggedIndex, 1)
  newColumns.splice(targetIndex, 0, removed)

  props.updateAttributes({ columns: newColumns })
}

// 开始添加任务
const startAddTask = (columnId) => {
  addingTaskColumnId.value = columnId
  newTaskContent.value = ''
  nextTick(() => {
    if (inputRef.value) {
      // 处理 v-for 中的 ref 数组
      const el = Array.isArray(inputRef.value) ? inputRef.value[0] : inputRef.value
      el?.focus()
    }
  })
}

// 确认添加任务
const confirmAddTask = () => {
  if (!newTaskContent.value.trim()) {
    addingTaskColumnId.value = null
    return
  }

  const newTask = {
    id: Math.random().toString(36).substr(2, 9),
    content: newTaskContent.value.trim(),
    columnId: addingTaskColumnId.value
  }

  props.updateAttributes({
    tasks: [...tasks.value, newTask]
  })
  
  // 保持在添加状态，方便连续添加，或者清空
  newTaskContent.value = ''
  // addingTaskColumnId.value = null // 如果想添加完就关闭，取消注释这行
}

// 取消添加任务
const cancelAddTask = () => {
  addingTaskColumnId.value = null
  newTaskContent.value = ''
}

// 开始添加列
const startAddColumn = () => {
  addingColumn.value = true
  newColumnTitle.value = ''
  nextTick(() => {
    // 这里需要一个新的 ref 指向列标题输入框，简单起见我们复用 inputRef 或者新建一个
    const el = document.getElementById('new-column-input')
    el?.focus()
  })
}

// 确认添加列
const confirmAddColumn = () => {
  if (!newColumnTitle.value.trim()) {
    addingColumn.value = false
    return
  }

  const newColumn = {
    id: Math.random().toString(36).substr(2, 9),
    title: newColumnTitle.value.trim(),
    color: ['#ffe2dd', '#fdecc8', '#dbeddb', '#d3e5ef'][columns.value.length % 4]
  }

  props.updateAttributes({
    columns: [...columns.value, newColumn]
  })
  
  addingColumn.value = false
  newColumnTitle.value = ''
}

// 取消添加列
const cancelAddColumn = () => {
  addingColumn.value = false
}

// 开始编辑列标题
const startEditColumnTitle = (col) => {
  editingColumnId.value = col.id
  tempColumnTitle.value = col.title
  nextTick(() => {
    if (columnTitleInputRef.value) {
      const el = Array.isArray(columnTitleInputRef.value) ? columnTitleInputRef.value[0] : columnTitleInputRef.value
      el?.focus()
    }
  })
}

// 确认编辑列标题
const confirmEditColumnTitle = () => {
  if (!editingColumnId.value) return

  const newTitle = tempColumnTitle.value.trim()
  if (newTitle) {
    const newColumns = columns.value.map(c => {
      if (c.id === editingColumnId.value) {
        return { ...c, title: newTitle }
      }
      return c
    })
    props.updateAttributes({ columns: newColumns })
  }
  
  editingColumnId.value = null
  tempColumnTitle.value = ''
}

// 取消编辑列标题
const cancelEditColumnTitle = () => {
  editingColumnId.value = null
  tempColumnTitle.value = ''
}

// 删除任务
const deleteTask = (taskId) => {
  if (!confirm('确定删除此任务吗?')) return
  const newTasks = tasks.value.filter(t => t.id !== taskId)
  props.updateAttributes({ tasks: newTasks })
}

// 删除列
const deleteColumn = (columnId) => {
  if (!confirm('确定删除此列及其所有任务吗?')) return
  
  const newColumns = columns.value.filter(c => c.id !== columnId)
  const newTasks = tasks.value.filter(t => t.columnId !== columnId)
  
  props.updateAttributes({
    columns: newColumns,
    tasks: newTasks
  })
}

</script>

<template>
  <node-view-wrapper class="kanban-wrapper" :class="{ 'is-selected': selected }">
    <div class="kanban-board">
      <!-- 列循环 -->
      <div 
        v-for="col in columns" 
        :key="col.id" 
        class="kanban-column"
        draggable="true"
        @dragstart="onColumnDragStart($event, col)"
        @dragend="onColumnDragEnd"
        @dragover.prevent
        @drop="onColumnDrop($event, col.id)"
      >
        <!-- 列头 -->
        <div class="column-header">
          <div class="header-title">
            <input
              v-if="editingColumnId === col.id"
              ref="columnTitleInputRef"
              v-model="tempColumnTitle"
              class="column-title-input"
              @keydown.enter="confirmEditColumnTitle"
              @keydown.esc="cancelEditColumnTitle"
              @blur="confirmEditColumnTitle"
              @click.stop
            />
            <span 
              v-else 
              class="status-badge" 
              :style="{ background: col.color }"
              @click="startEditColumnTitle(col)"
            >
              {{ col.title }}
            </span>
            <span class="count">{{ getTasksByColumn(col.id).length }}</span>
          </div>
          <div class="header-actions">
            <button @click="deleteColumn(col.id)" class="action-btn">×</button>
          </div>
        </div>

        <!-- 任务列表 -->
        <div class="task-list">
          <div 
            v-for="task in getTasksByColumn(col.id)" 
            :key="task.id" 
            class="task-card"
            draggable="true"
            @dragstart.stop="onTaskDragStart($event, task)"
            @dragend.stop="onTaskDragEnd"
            @drop="onTaskDrop($event, task)"
            @dragover.prevent
          >
            <span class="task-content">{{ task.content }}</span>
            <button class="delete-task-btn" @click.stop="deleteTask(task.id)">🗑️</button>
          </div>
          
          <!-- 添加任务输入框 -->
          <div v-if="addingTaskColumnId === col.id" class="new-task-input-wrapper">
            <input
              ref="inputRef"
              v-model="newTaskContent"
              class="new-task-input"
              placeholder="输入任务内容..."
              @keydown.enter="confirmAddTask"
              @keydown.esc="cancelAddTask"
              @blur="confirmAddTask"
            />
          </div>
          
          <!-- 添加任务按钮 -->
          <button v-else class="add-task-btn" @click="startAddTask(col.id)">+ New</button>
        </div>
      </div>

      <!-- 添加新列按钮 -->
      <div class="add-column-wrapper">
        <div v-if="addingColumn" class="new-column-input-wrapper">
           <input
              id="new-column-input"
              v-model="newColumnTitle"
              class="new-column-input"
              placeholder="列标题..."
              @keydown.enter="confirmAddColumn"
              @keydown.esc="cancelAddColumn"
              @blur="confirmAddColumn"
            />
        </div>
        <button v-else class="add-column-btn" @click="startAddColumn">+ Add Group</button>
      </div>
    </div>
  </node-view-wrapper>
</template>

<style scoped>
.kanban-wrapper {
  margin: 2rem 0;
  overflow-x: auto;
  padding-bottom: 1rem;
}

.kanban-board {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  min-height: 200px;
}

.kanban-column {
  min-width: 260px;
  width: 260px;
  background: #f7f7f5; /* Notion gray background */
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  padding: 8px; /* Slightly more padding */
}

/* Header */
.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 0 4px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  font-size: 0.85rem;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
  color: #37352f;
  cursor: text; /* Indicate editable */
}

.status-badge:hover {
  background: rgba(0, 0, 0, 0.05) !important; /* Visual feedback */
}

.column-title-input {
  font-size: 0.85rem;
  padding: 1px 4px;
  border: 1px solid #3b82f6;
  border-radius: 3px;
  outline: none;
  width: 120px;
  color: #37352f;
  font-weight: 500;
  background: white;
}

.count {
  color: #9b9a97;
  font-size: 0.8rem;
}

.action-btn {
  border: none;
  background: transparent;
  color: #9b9a97;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.2s;
}

.kanban-column:hover .action-btn {
  opacity: 1;
}

/* Task List */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 50px; /* Drop area */
}

.task-card {
  background: white;
  padding: 8px 10px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e2e0; /* Subtle border */
  cursor: grab;
  font-size: 0.9rem;
  color: #37352f;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: box-shadow 0.2s;
}

.task-card:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.task-card:active {
  cursor: grabbing;
}

.delete-task-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.8rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.task-card:hover .delete-task-btn {
  opacity: 1;
}

/* Buttons */
.add-task-btn {
  background: transparent;
  border: none;
  color: #9b9a97;
  text-align: left;
  padding: 6px 4px;
  font-size: 0.85rem;
  cursor: pointer;
  border-radius: 3px;
  transition: background 0.2s;
}

.add-task-btn:hover {
  background: rgba(0, 0, 0, 0.03);
  color: #37352f;
}

.add-column-btn {
  min-width: 100px;
  background: transparent;
  border: none;
  color: #9b9a97;
  font-size: 0.9rem;
  cursor: pointer;
  padding-top: 6px;
}

.add-column-btn:hover {
  color: #37352f;
}

.new-task-input-wrapper {
  padding: 0 4px;
  margin-bottom: 8px;
}

.new-task-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #3b82f6;
  border-radius: 4px;
  font-size: 0.9rem;
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.new-column-input-wrapper {
  min-width: 200px;
  padding-top: 4px;
}

.new-column-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #e2e2e0;
  border-radius: 4px;
  font-size: 0.9rem;
  outline: none;
}

.new-column-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
</style>
