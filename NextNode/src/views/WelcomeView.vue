<!-- src/views/WelcomePage.vue -->
<template>
  <div class="welcome-container">
    <div class="content">
      <h1>👋 欢迎来到 NextNote</h1>
      <p>请点击左侧 sidebar 新建文档，或选择已有文档开始编辑。</p>
    </div>
  </div>
</template>

<style scoped>
.welcome-container {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-bg, #fff);
  color: var(--text-color, #37352f);
  transition: background-color 0.25s ease, color 0.25s ease;
}

.content {
  text-align: center;
}

h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
}

p {
  color: var(--muted-color, #999);
}
</style>