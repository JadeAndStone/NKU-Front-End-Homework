<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './components/sidebar/Sidebar.vue'
import { RouterView } from 'vue-router'
import FloatThemeToggle from './components/widgets/FloatThemeToggle.vue'

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

    <!-- 全局浮动昼夜切换按钮 -->
    <FloatThemeToggle />
  </div>
</template>

<style>
/* 新增：全局主题变量默认值（可被 FloatThemeToggle 动态覆盖） */
:root {
  --app-bg: #f8fafc;
  --card-bg: #ffffff;
  --text-color: #111827;
  --muted-color: #666666;
  --sidebar-bg: #f1f5f9;
  --sidebar-text: #0f172a;

  /* 新增 编辑器变量 */
  --editor-bg: #ffffff;
  --editor-text: #0f172a;
  --editor-border: #e5e7eb;
  --editor-placeholder: #9ca3af;
}

/* 全局样式 */
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
}

/* 侧边栏 通用选择器（覆盖组件内部常见根类/标签） */
.sidebar,
aside,
.sidebar-root {
  background: var(--sidebar-bg, #f1f5f9) !important;
  color: var(--sidebar-text, #0f172a) !important;
  transition: background-color 0.25s ease, color 0.25s ease;
}

/* 侧边栏折叠按钮（使用变量，响应主题） */
.sidebar-toggle-btn {
  position: absolute;
  left: 35%;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  width: 20px;
  height: 60px;
  background: var(--card-bg, #e5e5e5);
  border: none;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  opacity: 0;
  color: var(--text-color);
}

.sidebar-toggle-btn:hover {
  background: color-mix(in srgb, var(--card-bg) 90%, black 10%);
}

/* 悬停展示折叠按钮 */
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
  color: var(--muted-color, #666);
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
  background: var(--app-bg, #fff);
  color: var(--text-color, #111827);
  transition: background-color 0.25s ease, color 0.25s ease;
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

/* 新增：编辑器容器/常见编辑器选择器使用主题变量 */
.editor-wrapper {
  background: var(--editor-bg);
  color: var(--editor-text);
  border: 1px solid var(--editor-border);
  border-radius: 6px;
  transition: background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease;
}

/* 让内嵌编辑器内容继承颜色（CodeMirror/monaco 等常见类名覆盖）*/
.editor-wrapper textarea,
.editor-wrapper pre,
.editor-wrapper .editor,
.editor-wrapper .CodeMirror,
.editor-wrapper .monaco-editor {
  background: transparent !important;
  color: inherit !important;
}

/* 占位符颜色 */
.editor-wrapper ::placeholder {
  color: var(--editor-placeholder);
  opacity: 1;
}

/* 🔥 样式冲突修复补丁（保留，但使用变量控制背景/文字色） */
body {
  display: block !important;
  place-items: unset !important;
  min-width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  background: var(--app-bg, #fff);
  color: var(--text-color, #111827);
  transition: background-color 0.25s ease, color 0.25s ease;
}

#app {
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  text-align: left !important;
  width: 100vw;
  height: 100vh;
  transition: background-color 0.25s ease, color 0.25s ease;
}
</style>