export const recordKinds = [
  { id: 'all', label: '全部' },
  { id: 'experience', label: '经历' },
  { id: 'project', label: '项目' },
  { id: 'judgment', label: '判断' },
  { id: 'change', label: '变化' },
  { id: 'thought', label: '想法' },
] as const;
export const projectStatuses = { ongoing: '进行中', completed: '已完成', paused: '已暂停', unknown: '状态待补充' } as const;
