<script setup lang="ts">
// 你的编辑器组件可能原本在这里，现在我们要改成路由模式了
import Sidebar from './components/sidebar/Sidebar.vue'
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="app-layout">
    <!-- 1. 左边放队友的侧边栏 -->
    <Sidebar />
    
    <!-- 2. 右边放路由出口 (未来会显示 DocumentPage -> Editor) -->
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
}

.main-content {
  flex: 1; /* 占满剩余空间 */
  overflow-y: auto;
  background: #fff;
}
</style>