import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CalendarBlock from '@/components/widgets/CalendarBlock.vue'

export default Node.create({
  name: 'calendar',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      events: {
        default: [],
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'calendar-component',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['calendar-component', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return VueNodeViewRenderer(CalendarBlock)
  },
})
