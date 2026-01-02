<script setup>
/**
 * 块级交互使用示例
 * 展示如何在项目中集成和使用拖拽功能
 */
import { ref } from 'vue'
import Editor from '@/components/editor/Editor.vue'
import DragHandle from '@/components/editor/DragHandle.vue'
import { useDocumentStore } from '@/stores/document'

// 获取文档store
const documentStore = useDocumentStore()

// 编辑内容
const editorContent = ref({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: '欢迎使用 NextNode 编辑器！' }
      ]
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: '将鼠标悬停在段落上，你会看到左侧出现一个拖拽手柄（⋮⋮）。' }
      ]
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: '点击手柄可以打开菜单，进行复制、删除、转换类型等操作。' }
      ]
    }
  ]
})

// 编辑器实例
const editor = ref(null)

// 处理编辑内容更新
const handleContentUpdate = (newContent) => {
  editorContent.value = newContent
  // 可以在这里保存到数据库
  console.log('Content updated:', newContent)
}

// 处理编辑器挂载
const handleEditorMounted = (editorInstance) => {
  editor.value = editorInstance
  console.log('Editor mounted:', editorInstance)
}

// 处理块操作
const handleBlockAction = ({ action, blockType }) => {
  console.log('Block action:', action, blockType)
  
  // 根据不同操作类型显示通知
  const messages = {
    delete: '已删除块',
    duplicate: '已复制块',
    convertType: `已转换为${blockType}`
  }
  
  // 可以在这里显示 Toast 通知
  if (messages[action]) {
    console.log('Notification:', messages[action])
  }
}
</script>

<template>
  <div class="editor-example-container">
    <div class="editor-header">
      <h1>📝 NextNode 编辑器 - 块级交互示例</h1>
      <p class="subtitle">展示完整的拖拽、删除、复制、类型转换功能</p>
    </div>

    <div class="editor-area">
      <Editor 
        v-model="editorContent"
        :editable="true"
        @update:model-value="handleContentUpdate"
        @mounted="handleEditorMounted"
      />
    </div>

    <div class="info-panel">
      <div class="section">
        <h3>功能说明</h3>
        <ul>
          <li>
            <strong>悬浮手柄：</strong> 鼠标悬停在任何块上，左侧会出现拖拽手柄
          </li>
          <li>
            <strong>拖拽移动：</strong> 点击并按住手柄可以拖拽块到其他位置
          </li>
          <li>
            <strong>块操作菜单：</strong> 点击手柄打开菜单
            <ul>
              <li><strong>复制：</strong> 复制当前块到下方</li>
              <li><strong>转换类型：</strong> 将块转换为其他类型（标题、列表等）</li>
              <li><strong>删除：</strong> 删除当前块</li>
            </ul>
          </li>
          <li>
            <strong>动画效果：</strong> 所有操作都伴随平滑的动画效果
          </li>
        </ul>
      </div>

      <div class="section">
        <h3>快捷键提示</h3>
        <ul>
          <li><code>/</code> - 打开斜杠菜单插入特殊块</li>
          <li><code>Ctrl+B</code> - 加粗</li>
          <li><code>Ctrl+I</code> - 斜体</li>
          <li><code>#</code> + 空格 - 转换为标题</li>
          <li><code>-</code> + 空格 - 转换为列表</li>
        </ul>
      </div>

      <div class="section">
        <h3>当前内容</h3>
        <pre><code>{{ JSON.stringify(editorContent, null, 2) }}</code></pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-example-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
}

.editor-header {
  text-align: center;
  color: white;
  margin-bottom: 40px;

  h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
    font-weight: 700;
  }

  .subtitle {
    font-size: 1.1rem;
    opacity: 0.9;
  }
}

.editor-area {
  max-width: 900px;
  margin: 0 auto 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.info-panel {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.section {
  margin-bottom: 30px;

  &:last-child {
    margin-bottom: 0;
  }

  h3 {
    font-size: 1.3rem;
    color: #333;
    margin-bottom: 15px;
    border-bottom: 2px solid #667eea;
    padding-bottom: 10px;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      padding: 8px 0;
      color: #555;
      line-height: 1.6;

      strong {
        color: #333;
      }

      code {
        background: #f5f5f5;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Monaco', 'Courier New', monospace;
        font-size: 0.9rem;
      }

      ul {
        margin-left: 20px;
        margin-top: 8px;
      }
    }
  }

  pre {
    background: #f5f5f5;
    padding: 15px;
    border-radius: 8px;
    overflow-x: auto;
    border-left: 3px solid #667eea;

    code {
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.85rem;
      color: #333;
      line-height: 1.5;
    }
  }
}

@media (max-width: 768px) {
  .editor-header h1 {
    font-size: 1.8rem;
  }

  .info-panel {
    padding: 20px;
  }
}
</style>
