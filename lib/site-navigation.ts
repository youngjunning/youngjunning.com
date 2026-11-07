import { siteProfile } from './site-profile.mjs';

export const siteNavigation = [
  { id: 'home', href: '/', label: '总览', meaning: `认识${siteProfile.name}与本周更新`, code: 'INDEX', primary: true },
  { id: 'records', href: '/records', label: '个人记录', meaning: '经历、判断与变化', code: 'MEMORY', primary: true },
  { id: 'library', href: '/blog', label: '手记', meaning: '文章与周刊', code: 'NOTEBOOK', primary: true },
  { id: 'favorites', href: '/favorites', label: '百宝箱', meaning: '资源与知识笔记', code: 'COLLECTION', primary: true },
  { id: 'chat', href: '/chat', label: `和${siteProfile.name}聊聊`, meaning: '有来源的数字分身对话', code: 'CONVERSATION', primary: true },
  { id: 'topics', href: '/topics', label: '关注主题', meaning: '跨栏目探索内容', code: 'SUBJECTS', primary: false },
  { id: 'graph', href: '/graph', label: '关联图谱', meaning: '引用与关联的依据', code: 'CONNECTIONS', primary: false },
  { id: 'research', href: '/research', label: '探索清单', meaning: '值得继续研究的问题', code: 'QUESTIONS', primary: false },
  { id: 'excerpts', href: '/excerpts', label: '对话摘录', meaning: '值得重读的对话片段', code: 'EXCERPTS', primary: false },
  { id: 'skills', href: '/skills', label: '技能库', meaning: 'Skills · 工作流与维护', code: 'SKILLS', primary: false },
  { id: 'agent-configs', href: '/agent-configs', label: 'AGENTS.md', meaning: '全局与项目配置 · 模型评测', code: 'INSTRUCTIONS', primary: false },
  { id: 'okr', href: '/okr', label: '下一站', meaning: 'OKR · 目标与进展', code: 'OBJECTIVES', primary: false },
  { id: 'agent', href: '/agent', label: '接入与 API', meaning: '读取 Skill 与接口', code: 'FOR AGENTS', primary: false },
] as const;
export type SiteSection = typeof siteNavigation[number]['id'];
