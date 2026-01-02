<script setup>
import { NodeViewWrapper } from '@tiptap/vue-3'
import { computed, ref, nextTick } from 'vue'
import { useDraggable } from '@vueuse/core'

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

// 获取当前月份（默认为当前时间）
const currentDate = ref(new Date())

// 拖拽状态
const draggedEvent = ref(null)

// 拖拽开始
const onDragStart = (e, event) => {
  draggedEvent.value = event
  e.dataTransfer.effectAllowed = 'move'
  // 使用自定义 MIME 类型，防止被编辑器当作文本插入
  e.dataTransfer.setData('application/x-calendar-event', event.id)
  e.target.style.opacity = '0.5'
}

// 拖拽结束
const onDragEnd = (e) => {
  e.target.style.opacity = '1'
  draggedEvent.value = null
}

// 拖拽进入日期格子
const onDrop = (e, day) => {
  // 尝试获取自定义类型数据，如果获取不到（说明不是内部拖拽），则直接返回
  const eventId = e.dataTransfer.getData('application/x-calendar-event') || draggedEvent.value?.id
  if (!eventId) return

  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const targetDateKey = `${year}-${month + 1}-${day}`

  // 更新事件日期
  const newEvents = events.value.map(ev => {
    if (ev.id === eventId) {
      return { ...ev, date: targetDateKey }
    }
    return ev
  })

  props.updateAttributes({ events: newEvents })
}

const calendarCardRef = ref(null)
const calendarWidth = ref(400) // Default width
const calendarHeight = ref(400) // Default height

// 正在编辑的状态：{ date: '2024-12-30', value: '' }
const editingState = ref(null)
const inputRef = ref(null)

// Drag handle ref
const dragHandleRef = ref(null)

const daysInMonth = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  return new Date(year, month + 1, 0).getDate()
})

const firstDayOffset = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  return new Date(year, month, 1).getDay()
})

// 从 node.attrs 中获取事件数据
const events = computed(() => {
  const rawEvents = props.node.attrs.events
  if (Array.isArray(rawEvents)) {
    return rawEvents
  }
  // 兼容旧数据
  if (typeof rawEvents === 'object' && rawEvents !== null) {
    return Object.keys(rawEvents).map(date => ({
      id: Math.random().toString(36).substr(2, 9),
      date,
      title: 'Event',
      color: 'blue'
    }))
  }
  return []
})

const monthName = computed(() => {
  return currentDate.value.toLocaleString('default', { month: 'long', year: 'numeric' })
})

const prevMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

const nextMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}

const getEventsForDay = (day) => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const dateKey = `${year}-${month + 1}-${day}`
  return events.value.filter(e => e.date === dateKey)
}

// 开始添加事件（显示输入框）
const startAddEvent = (day) => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const dateKey = `${year}-${month + 1}-${day}`
  
  editingState.value = {
    date: dateKey,
    value: ''
  }
  
  // 自动聚焦输入框
  nextTick(() => {
    // 确保 DOM 更新后再聚焦
    if (inputRef.value) {
        // 如果是数组（v-for 中 ref 是数组），取第一个
        const el = Array.isArray(inputRef.value) ? inputRef.value[0] : inputRef.value;
        el?.focus();
    }
  })
}

// 保存事件
const saveEvent = () => {
  if (!editingState.value || !editingState.value.value.trim()) {
    editingState.value = null
    return
  }

  const newEvent = {
    id: Math.random().toString(36).substr(2, 9),
    date: editingState.value.date,
    title: editingState.value.value.trim(),
    color: ['blue', 'red', 'green', 'orange', 'purple'][Math.floor(Math.random() * 5)]
  }

  const newEvents = [...events.value, newEvent]
  props.updateAttributes({ events: newEvents })
  
  editingState.value = null
}

// 取消编辑
const cancelEdit = () => {
  editingState.value = null
}

// Popover 状态
const popoverVisible = ref(false)
const popoverPosition = ref({ x: 0, y: 0 })
const activeEvent = ref(null)
const tempEventTitle = ref('')
const tempEventColor = ref('')

const openEventPopover = (e, event) => {
  e.stopPropagation()
  activeEvent.value = event
  tempEventTitle.value = event.title
  tempEventColor.value = event.color || 'blue'
  
  // 计算位置，避免溢出屏幕
  const rect = e.target.getBoundingClientRect()
  popoverPosition.value = {
    x: rect.left + window.scrollX,
    y: rect.bottom + window.scrollY + 5
  }
  
  popoverVisible.value = true
}

const closePopover = () => {
  popoverVisible.value = false
  activeEvent.value = null
}

const saveEventDetails = () => {
  if (!activeEvent.value) return
  
  const newEvents = events.value.map(ev => {
    if (ev.id === activeEvent.value.id) {
      return { 
        ...ev, 
        title: tempEventTitle.value,
        color: tempEventColor.value
      }
    }
    return { ...ev }
  })
  
  props.updateAttributes({ events: JSON.parse(JSON.stringify(newEvents)) })
  closePopover()
}

const deleteActiveEvent = () => {
  if (!activeEvent.value) return
  if (!confirm('删除此日程?')) return
  
  const newEvents = events.value.filter(ev => ev.id !== activeEvent.value.id).map(ev => ({ ...ev }))
  props.updateAttributes({ events: JSON.parse(JSON.stringify(newEvents)) })
  closePopover()
}

const isToday = (day) => {
  const today = new Date()
  return day === today.getDate() && 
         currentDate.value.getMonth() === today.getMonth() && 
         currentDate.value.getFullYear() === today.getFullYear()
}

const isEditing = (day) => {
  if (!editingState.value) return false
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const dateKey = `${year}-${month + 1}-${day}`
  return editingState.value.date === dateKey
}

// Implement resize functionality
const startResize = (e, direction) => {
  e.preventDefault(); // Prevent default text selection
  e.stopPropagation(); // 阻止事件冒泡
  
  const startX = e.clientX;
  const startY = e.clientY;
  const startWidth = calendarWidth.value;
  const startHeight = calendarHeight.value;

  const onMouseMove = (moveEvent) => {
    // Width resize
    if (direction === 'x' || direction === 'xy') {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      if (newWidth > 200) { // Minimum width constraint
        calendarWidth.value = newWidth;
      }
    }
    
    // Height resize
    if (direction === 'y' || direction === 'xy') {
      const newHeight = startHeight + (moveEvent.clientY - startY);
      if (newHeight > 300) { // Minimum height constraint
        calendarHeight.value = newHeight;
      }
    }
    
    // 强制触发更新
    moveEvent.preventDefault();
  };

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};
</script>

<template>
  <node-view-wrapper class="calendar-wrapper" :class="{ 'is-selected': selected }">
    <div 
      class="calendar-card" 
      ref="calendarCardRef"
      :style="{ width: calendarWidth + 'px', height: calendarHeight + 'px', maxWidth: 'none', maxHeight: 'none' }"
    >
      <!-- 头部：月份切换 -->
      <div class="calendar-header">
        <div class="header-left">
          <span class="month-title">{{ monthName }}</span>
          <div class="nav-buttons">
            <button @click="prevMonth" class="nav-btn">&lt;</button>
            <button @click="nextMonth" class="nav-btn">&gt;</button>
          </div>
        </div>
        <div class="header-right">
          <span class="today-btn" @click="currentDate = new Date()">Today</span>
        </div>
      </div>

      <!-- 星期头 -->
      <div class="weekdays-grid">
        <div v-for="day in ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']" :key="day" class="weekday">
          {{ day }}
        </div>
      </div>

      <!-- 日期网格 -->
      <div class="days-grid">
        <!-- 空白填充 -->
        <div 
          v-for="n in firstDayOffset" 
          :key="'empty-' + n" 
          class="day-cell empty"
        ></div>
        
        <!-- 实际日期 -->
        <div 
          v-for="day in daysInMonth" 
          :key="day" 
          class="day-cell"
          :class="{ 'is-today': isToday(day) }"
          @dragover.prevent
          @drop="onDrop($event, day)"
        >
          <div class="cell-header">
            <span class="day-number">{{ day }}</span>
            <button class="add-btn" @click.stop="startAddEvent(day)">+</button>
          </div>
          
          <div class="events-list">
            <div 
              v-for="event in getEventsForDay(day)" 
              :key="event.id" 
              class="event-chip"
              :class="`color-${event.color}`"
              draggable="true"
              @dragstart="onDragStart($event, event)"
              @dragend="onDragEnd"
              @click="openEventPopover($event, event)"
              :title="event.title"
            >
              {{ event.title }}
            </div>
            
            <!-- 输入框 -->
            <div v-if="isEditing(day)" class="event-input-wrapper">
              <input
                ref="inputRef"
                v-model="editingState.value"
                class="event-input"
                placeholder="New Event"
                @keydown.enter="saveEvent"
                @blur="saveEvent"
                @keydown.esc="cancelEdit"
                @click.stop
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- Resize Handle -->
      <div class="resize-handle resize-handle-right" @mousedown.stop="startResize($event, 'x')"></div>
      <div class="resize-handle resize-handle-bottom" @mousedown.stop="startResize($event, 'y')"></div>
      <div class="resize-handle-corner" @mousedown.stop="startResize($event, 'xy')"></div>

      <!-- Popover -->
      <teleport to="body">
        <div 
          v-if="popoverVisible" 
          class="event-popover"
          :style="{ top: popoverPosition.y + 'px', left: popoverPosition.x + 'px' }"
          @click.stop
        >
          <div class="popover-content">
            <input 
              v-model="tempEventTitle" 
              class="popover-input"
              placeholder="Event name"
              @keydown.enter="saveEventDetails"
            />
            
            <div class="color-picker">
              <div 
                v-for="color in ['blue', 'red', 'green', 'orange', 'purple']" 
                :key="color"
                class="color-option"
                :class="[`color-${color}`, { active: tempEventColor === color }]"
                @click="tempEventColor = color"
              ></div>
            </div>
            
            <div class="popover-actions">
              <button class="btn-delete" @click="deleteActiveEvent">Delete</button>
              <button class="btn-save" @click="saveEventDetails">Save</button>
            </div>
          </div>
          
          <!-- 点击外部关闭 -->
          <div class="popover-overlay" @click="closePopover"></div>
        </div>
      </teleport>
    </div>
  </node-view-wrapper>
</template>

<style scoped>
.calendar-wrapper {
  margin: 2rem 0;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  display: flex; /* Allow centering or aligning if needed */
}

.calendar-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  position: relative; /* For resize handle positioning */
  /* Remove max-width to allow resizing */
}

.calendar-wrapper.is-selected .calendar-card {
  box-shadow: 0 0 0 2px rgba(35, 131, 226, 0.5);
}

/* Header */
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.month-title {
  font-weight: 600;
  font-size: 1.1rem;
  color: #37352f;
}

.nav-buttons {
  display: flex;
  gap: 4px;
}

.nav-btn {
  padding: 2px 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #787774;
  border-radius: 4px;
}

.nav-btn:hover {
  background: #efefef;
  color: #37352f;
}

.today-btn {
  font-size: 0.85rem;
  color: #787774;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.today-btn:hover {
  background: #efefef;
}

/* Grid */
.weekdays-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid #e2e8f0;
  background: #fbfbfa;
}

.weekday {
  padding: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #787774;
  border-right: 1px solid #e2e8f0;
}

.weekday:last-child {
  border-right: none;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #e2e8f0; 
  gap: 1px;
  flex: 1; /* Take remaining height */
  overflow-y: auto; /* Scroll if too many events */
  /* Ensure header alignment by matching scrollbar width if present */
  scrollbar-gutter: stable;
}

.day-cell {
  background: white;
  /* Remove fixed min-height, let it grow */
  padding: 4px;
  position: relative;
  display: flex;
  flex-direction: column;
  /* Remove overflow-y from cell, let grid handle it */
}

.day-cell.empty {
  background: #fbfbfa;
}

.day-cell.is-today {
  background: #fff;
}

.day-cell.is-today .day-number {
  background: #eb5757;
  color: white;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.cell-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

.day-number {
  font-size: 0.85rem;
  color: #787774;
  padding: 2px 6px;
}

.add-btn {
  opacity: 0;
  border: none;
  background: transparent;
  font-size: 1.2rem;
  line-height: 1;
  color: #9b9a97;
  cursor: pointer;
  padding: 0 4px;
  transition: opacity 0.2s;
}

.day-cell:hover .add-btn {
  opacity: 1;
}

.add-btn:hover {
  color: #37352f;
}

/* Events */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.event-chip {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #37352f;
  transition: filter 0.2s;
}

.event-chip:hover {
  filter: brightness(0.95);
}

.event-input-wrapper {
  padding: 2px 0;
}

.event-input {
  width: 100%;
  font-size: 0.75rem;
  padding: 2px 4px;
  border: 1px solid #3b82f6;
  border-radius: 3px;
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* Resize Handle */
.resize-handle {
  position: absolute;
  background: transparent;
  transition: background 0.2s;
  z-index: 100; /* 提升层级 */
}

.resize-handle-right {
  right: 0;
  top: 0;
  bottom: 20px; /* 避让角落 */
  width: 12px; /* 增大感应区域 */
  cursor: col-resize;
}

.resize-handle-bottom {
  left: 0;
  right: 20px; /* 避让角落 */
  bottom: 0;
  height: 12px; /* 增大感应区域 */
  cursor: row-resize;
}

.resize-handle-corner {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 24px; /* 更大的角落触控区 */
  height: 24px;
  cursor: nwse-resize;
  background: transparent;
  z-index: 101; /* 确保在最上层 */
}

.resize-handle-corner::after {
  content: '';
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 0 6px 6px;
  border-color: transparent transparent #ccc transparent;
}

.calendar-card:hover .resize-handle-corner::after {
  border-color: transparent transparent #3b82f6 transparent;
}

.resize-handle:hover,
.calendar-card:hover .resize-handle {
  background: rgba(0, 0, 0, 0.05);
}

/* Notion colors */
.color-blue { background: #e3f2fd; }
.color-red { background: #ffebee; }
.color-green { background: #e8f5e9; }
.color-orange { background: #fff3e0; }
.color-purple { background: #f3e5f5; }

/* Popover Styles */
.event-popover {
  position: absolute;
  z-index: 9999;
}

.popover-content {
  background: white;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  padding: 12px;
  width: 240px;
  position: relative;
  z-index: 10001;
}

.popover-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 0.9rem;
  margin-bottom: 12px;
  outline: none;
}

.popover-input:focus {
  border-color: #3b82f6;
}

.color-picker {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.color-option {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
}

.color-option.active {
  border-color: #37352f;
}

.popover-actions {
  display: flex;
  justify-content: space-between;
}

.btn-delete {
  color: #eb5757;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-save {
  background: #2383e2;
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.popover-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
}
</style>
