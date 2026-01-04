<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './components/sidebar/Sidebar.vue'
import { RouterView } from 'vue-router'

// 侧边栏折叠状态
const isSidebarCollapsed = ref(false)

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}
</script>

<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <!-- 1. 左边放侧边栏 -->
    <transition name="sidebar-slide">
      <Sidebar v-show="!isSidebarCollapsed" />
    </transition>
    
    <!-- 折叠/展开按钮 -->
    <button 
      class="sidebar-toggle-btn"
      :class="{ 'collapsed': isSidebarCollapsed }"
      @click="toggleSidebar"
      :title="isSidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'"
    >
      <span class="toggle-icon">{{ isSidebarCollapsed ? '▶' : '◀' }}</span>
    </button>
    
    <!-- 2. 右边放路由出口 -->
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style>
/* 全局样式 */
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
}

/* 侧边栏折叠按钮 */
.sidebar-toggle-btn {
  position: absolute;
  left: 35%;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  width: 20px;
  height: 60px;
  background: #e5e5e5;
  border: none;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  opacity: 0;
}

.sidebar-toggle-btn:hover {
  background: #d4d4d4;
}

.app-layout:hover .sidebar-toggle-btn {
  opacity: 1;
}

.sidebar-toggle-btn.collapsed {
  left: 0;
  border-radius: 0 6px 6px 0;
  opacity: 1;
}

.toggle-icon {
  font-size: 10px;
  color: #666;
}

/* 侧边栏滑动过渡动画 */
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.sidebar-slide-enter-to,
.sidebar-slide-leave-from {
  transform: translateX(0);
  opacity: 1;
}

/* 折叠时主内容区域过渡 */
.main-content {
  flex: 1;
  overflow-y: auto;
  background: #fff;
  transition: all 0.3s ease;
}

/* 折叠状态下编辑器扩大 */
.app-layout.sidebar-collapsed .main-content {
  /* 编辑器会自动占满整个宽度 */
}

/* 折叠状态下编辑器样式调整 */
.app-layout.sidebar-collapsed .editor-wrapper {
  max-width: 1000px;
  transition: max-width 0.3s ease;
}

/* 🔥 样式冲突修复补丁 */
/* 覆盖 style.css 中的默认居中样式，确保笔记应用能全屏显示 */
body {
  display: block !important;
  place-items: unset !important;
  min-width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
}

#app {
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  text-align: left !important;
  width: 100vw;
  height: 100vh;
}
</style>