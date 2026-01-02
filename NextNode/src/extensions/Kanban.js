import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import KanbanBlock from '@/components/widgets/KanbanBlock.vue'

export default Node.create({
  name: 'kanban',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      columns: {
        default: [
          { id: 'todo', title: 'To Do', color: '#ffe2dd' },
          { id: 'progress', title: 'In Progress', color: '#fdecc8' },
          { id: 'done', title: 'Done', color: '#dbeddb' },
        ],
      },
      tasks: {
        default: [
          { id: '1', content: 'Design System', columnId: 'todo' },
          { id: '2', content: 'API Integration', columnId: 'progress' },
        ],
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'kanban-board',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['kanban-board', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return VueNodeViewRenderer(KanbanBlock)
  },
})
