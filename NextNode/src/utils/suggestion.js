// src/utils/suggestion.js
import { VueRenderer } from '@tiptap/vue-3'
import tippy from 'tippy.js'
import CommandList from '@/components/editor/CommandList.vue'

export default {
  items: ({ query }) => {
    // 这里定义菜单里有哪些选项
    // query 是用户输入 / 后面的字，比如 /h1，query就是 h1
    return [
      {
        title: '一级标题 (H1)',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run()
        },
      },
      {
        title: '二级标题 (H2)',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run()
        },
      },
      {
        title: '无序列表',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run()
        },
      },
          {
      title: '待办列表',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run()
      },
    },
    {
      title: '代码块',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
      },
    },
    {
      title: '插入图片',
      command: ({ editor, range }) => {
        // 创建隐藏的 input 元素
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        
        input.onchange = async (e) => {
          const file = e.target.files[0]
          if (file) {
            const reader = new FileReader()
            reader.onload = (readerEvent) => {
              const base64 = readerEvent.target.result
              editor.chain().focus().deleteRange(range).setImage({ src: base64 }).run()
            }
            reader.readAsDataURL(file)
          }
        }
        
        input.click()
      },
    },
    {
      title: '日历组件',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertContent({ type: 'calendar' }).run()
      },
    },
    {
      title: '看板组件',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertContent({ type: 'kanban' }).run()
      },
    },
    ].filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
  },

  render: () => {
    let component
    let popup

    return {
      onStart: props => {
        // 1. 创建 Vue 组件实例
        component = new VueRenderer(CommandList, {
          props,
          editor: props.editor,
        })

        // 2. 如果没找到建议项，不显示
        if (!props.clientRect) {
          return
        }

        // 3. 使用 tippy.js 把它挂载到 DOM 上
        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate(props) {
        component.updateProps(props)

        if (!props.clientRect) {
          return
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }
        // 把键盘事件传给 Vue 组件
        return component.ref?.onKeyDown(props)
      },

      onExit() {
        popup[0].destroy()
        component.destroy()
      },
    }
  },
}