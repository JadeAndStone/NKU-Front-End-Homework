<!-- src/components/CommandList.vue -->
<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  command: {
    type: Function,
    required: true,
  },
})

const selectedIndex = ref(0)

// 监听 items 变化，重置选中项
watch(() => props.items, () => {
  selectedIndex.value = 0
})

// 这个方法会被父级调用（处理键盘事件）
const onKeyDown = ({ event }) => {
  if (event.key === 'ArrowUp') {
    upHandler()
    return true
  }
  if (event.key === 'ArrowDown') {
    downHandler()
    return true
  }
  if (event.key === 'Enter') {
    enterHandler()
    return true
  }
  return false
}

const upHandler = () => {
  selectedIndex.value = ((selectedIndex.value + props.items.length) - 1) % props.items.length
}

const downHandler = () => {
  selectedIndex.value = (selectedIndex.value + 1) % props.items.length
}

const enterHandler = () => {
  selectItem(selectedIndex.value)
}

const selectItem = (index) => {
  const item = props.items[index]
  if (item) {
    props.command(item)
  }
}

// 暴露方法给父组件
defineExpose({
  onKeyDown
})
</script>

<template>
  <div class="items">
    <button
      v-for="(item, index) in items"
      :key="index"
      class="item"
      :class="{ 'is-selected': index === selectedIndex }"
      @click="selectItem(index)"
    >
      {{ item.title }}
    </button>
  </div>
</template>

<style scoped>
/* 菜单样式：简单的白底黑字悬浮框 */
.items {
  padding: 0.2rem;
  position: relative;
  border-radius: 0.5rem;
  background: #FFF;
  color: rgba(0, 0, 0, 0.8);
  overflow: hidden;
  font-size: 0.9rem;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0px 10px 20px rgba(0, 0, 0, 0.1);
  min-width: 150px;
}

.item {
  display: block;
  margin: 0;
  width: 100%;
  text-align: left;
  background: transparent;
  border-radius: 0.4rem;
  border: none;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
}

.item.is-selected {
  background: #eee; /* 选中时变灰 */
  font-weight: bold;
}
</style>