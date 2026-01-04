// 判断块类型是否允许类型转换
export function canConvertBlockType(el: HTMLElement | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  // 图片、日历、看板都不允许类型转换
  if (tag === 'IMG' || tag === 'CALENDAR-COMPONENT' || tag === 'KANBAN-COMPONENT') return false;
  if (el.hasAttribute && el.hasAttribute('data-node-view-wrapper')) {
    // 进一步判断自定义节点类型
    const type = el.getAttribute('data-type') || '';
    if (type === 'calendar' || type === 'kanban' || type === 'image') return false;
  }
  // 其他块允许
  return true;
}
