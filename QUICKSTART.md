# NextNote 快速开始指南

## 一、环境准备

### 1. 安装 Node.js

确保已安装 Node.js 16+ 和 npm。

```bash
node --version  # 应该 >= 16.0.0
npm --version
```

### 2. 安装依赖

```bash
cd NextNote
npm install
```

## 二、开发模式

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 开发工具

- **Chrome DevTools**: 查看 IndexedDB 数据（Application → Storage → IndexedDB）
- **Vue DevTools**: 查看 Pinia Store 状态（需要安装 Vue DevTools 浏览器扩展）

## 三、项目结构说明

```
NextNote/
├── src/
│   ├── stores/          # Pinia Store
│   │   ├── document.ts  # 文档管理（当前打开的文档）
│   │   └── tree.ts      # 文档树管理（侧边栏）
│   ├── types/           # TypeScript 类型
│   │   └── index.ts     # 核心数据模型
│   ├── utils/           # 工具函数
│   │   ├── idb.ts       # IndexedDB 封装
│   │   └── id.ts        # ID 生成
│   ├── router/          # 路由
│   │   └── index.ts     # 路由配置
│   ├── views/           # 页面组件
│   │   ├── HomeView.vue # 首页
│   │   └── PageView.vue # 文档页
│   └── main.ts          # 入口文件
├── package.json
├── vite.config.ts
└── README.md
```

## 四、核心概念

### 1. Page（页面）

- 对应一个文档
- 存储在 `treeStore.pages` 中
- 可以有子页面（形成文件夹结构）

### 2. Block（块）

- 文档的基本组成单元
- 存储在 `documentStore.blocks` 中（扁平化 Map）
- 通过 `parentId` 和 `childrenIds` 形成树形结构
