# NKU-Front-End-Homework

## NextNote (流时笔记)

> 一个基于块（Block-based）的现代化双链笔记应用，融合了基于时间阻塞（Time Blocking）的日程管理组件。
> **"不仅仅是记录，更是对思维与时间的深度重构。"**

![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D?style=flat-square&logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite)
![Tiptap](https://img.shields.io/badge/Editor-Tiptap-000000?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 📖 项目简介 (Project Overview)

**NextNote** 是我们前端课程的期末大作业。不同于传统的 CRUD 待办事项或静态博客，NextNote 挑战了富文本编辑器的复杂交互。

我们致力于打造一个类似 **Notion** 的编辑体验，核心亮点在于**将“日历”和“看板”作为可交互的文档组件（Widget Block）嵌入到笔记流中**。用户无需切换页面，即可在文档编写过程中，自然地通过拖拽和点击来规划时间。

### ✨ 核心特性 (Key Features)

*   **🧱 块级编辑体验**：基于 **Tiptap** 内核，支持斜杠命令 (`/`) 唤起菜单，Markdown 语法快捷输入。
*   **📅 嵌入式日历组件**：利用 Vue Custom Node View 技术，在文档流中渲染全功能日历，支持点击添加日程、拖拽调整时间。
*   **🖱️ 极致的交互手感**：
    *   **块拖拽 (Drag & Drop)**：支持段落、图片、组件的自由拖拽排序。
    *   **悬浮菜单**：选中文本弹出样式工具栏，鼠标悬停段落显示操作手柄。
*   **📂 无限层级文档树**：支持无限嵌套的侧边栏目录结构，基于递归组件实现。
*   **💾 Local-First 架构**：使用 **IndexedDB** 进行本地数据持久化，支持离线编辑，数据毫秒级保存。
*   **🎨 现代化 UI 设计**：完全适配 Dark Mode（深色模式），拥有流畅的骨架屏与过渡动画。

---

## 🛠️ 技术栈 (Tech Stack)

本项目采用目前前端业界最新的 **Vue 3 生态** 进行开发：

| 维度           | 技术选型                      | 选择理由                                                     |
| :------------- | :---------------------------- | :----------------------------------------------------------- |
| **核心框架**   | **Vue 3 (Composition API)**   | Setup 语法糖提供更好的逻辑复用与 TypeScript 支持。           |
| **构建工具**   | **Vite**                      | 秒级冷启动，极致的开发体验。                                 |
| **语言**       | **TypeScript**                | 强类型约束，保证多人协作时的代码健壮性。                     |
| **编辑器内核** | **Tiptap (ProseMirror)**      | Headless 无头编辑器，提供强大的自定义节点（Node View）能力。 |
| **状态管理**   | **Pinia**                     | 轻量级状态管理，配合持久化插件处理全局文档流。               |
| **样式方案**   | **Tailwind CSS**              | 原子化 CSS，快速构建响应式与暗黑模式界面。                   |
| **本地存储**   | **IndexedDB (via Dexie/IDB)** | 解决 LocalStorage 容量限制，存储富文本与图片数据。           |
| **图标库**     | **Lucide Vue**                | 风格统一、现代化的高质量 SVG 图标集。                        |
| **工具库**     | **VueUse**                    | 包含 `useDark`, `useDraggable`, `useStorage` 等实用 Hooks。  |

---

## 👥 团队分工 (Team Roles)

我们团队共 5 人，采用模块化开发模式，具体分工如下：

### 👨‍💻 成员 A (架构师 & 数据核心)
*   **职责**：项目基建搭建、全局状态管理 (Pinia)、IndexedDB 本地数据库封装、路由鉴权系统。
*   **难点攻克**：解决了富文本数据的大规模读写性能问题，设计了扁平化的文档存储结构。

### 👨‍💻 成员 B (编辑器内核)
*   **职责**：Tiptap 编辑器配置、Markdown 快捷指令实现、斜杠菜单 (`/` Slash Menu) 与气泡菜单开发。
*   **难点攻克**：实现了无鼠标操作体验，精准控制光标位置与菜单弹出的坐标计算。

### 👨‍💻 成员 C (自定义组件开发)
*   **职责**：**日历 Block** 与 **看板 Block** 的开发。将 Vue 组件封装为 Tiptap 的 Node View。
*   **难点攻克**：解决了编辑器内部组件的数据双向同步问题（Editor JSON <-> Component State）。

### 👨‍💻 成员 D (交互系统)
*   **职责**：实现 Notion 风格的块级拖拽（Drag Handle）、悬浮操作手柄、DOM 坐标计算与动画。
*   **难点攻克**：实现了跨浏览器的原生拖拽 API 兼容，保证拖拽时的 DOM 结构稳定。

### 👨‍💻 成员 E (UI/UX 设计)
*   **职责**：整体视觉设计、递归侧边栏组件、暗黑模式适配、着陆页（Landing Page）制作。
*   **难点攻克**：设计了递归组件的性能优化，以及精细的 CSS Transition 过渡效果。

---

## 📂 项目结构 (Directory Structure)

```text
src/
├── assets/             # 静态资源
├── components/         # 通用 UI 组件 (Button, Modal, etc.)
│   ├── editor/         # 编辑器相关组件 (SlashMenu, BubbleMenu)
│   ├── sidebar/        # 侧边栏递归组件
│   └── widgets/        # 自定义 Block 组件 (Calendar, Kanban)
├── composables/        # 组合式函数 (Hooks)
├── extensions/         # Tiptap 自定义扩展 (Custom Extensions)
├── stores/             # Pinia 状态仓库
├── styles/             # Tailwind 配置与全局样式
├── types/              # TypeScript 类型定义
├── views/              # 页面级组件
├── App.vue             # 根组件
└── main.ts             # 入口文件
```

---

## 🚀 快速开始 (Getting Started)

### 环境要求
*   Node.js >= 18.0.0
*   pnpm / yarn / npm

### 安装步骤

1.  **克隆仓库**
    ```bash
    git clone https://github.com/your-username/next-note.git
    cd next-note
    ```

2.  **安装依赖**
    ```bash
    pnpm install
    # 或者 npm install
    ```

3.  **启动开发服务器**
    ```bash
    pnpm dev
    ```
    访问 `http://localhost:5173` 即可查看项目。

4.  **项目打包**
    ```bash
    pnpm build
    ```

---

## 📸 效果演示 (Screenshots)

> *（此处将在开发完成后补充 GIF 动图与截图，包括：文档编辑、日历拖拽、暗黑模式切换等）*

---

## 🤝 开发规范 (Guidelines)

*   **Git Commit**: 遵循 `feat:`, `fix:`, `docs:`, `style:` 等标准前缀。
*   **分支管理**:
    *   `main`: 主分支，保持随时可发布状态。
    *   `dev`: 开发主分支。
    *   `feat/xxx`: 功能分支，开发完成后合并至 dev。
*   **代码风格**: 项目已配置 ESLint + Prettier，保存时自动格式化。

---

Copyright © 2025 NextNote Team. All Rights Reserved.