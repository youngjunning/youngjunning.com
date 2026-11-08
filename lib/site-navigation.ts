import { siteProfile } from './site-profile.mjs';

export const siteNavigation = [
  { id: 'home', href: '/', label: '总览', meaning: `认识${siteProfile.name}与本周更新`, code: 'INDEX', primary: true },
  { id: 'records', href: '/records', label: '个人记录', meaning: '经历、判断与变化', code: 'MEMORY', primary: true },
  { id: 'library', href: '/blog', label: '手记', meaning: '文章与周刊', code: 'NOTEBOOK', primary: true },
  { id: 'industry', href: '/aihot', label: '行业动态', meaning: 'AIHOT 线索与原始来源', code: 'INDUSTRY', primary: false },
  { id: 'favorites', href: '/favorites', label: '百宝箱', meaning: '资源与知识笔记', code: 'COLLECTION', primary: true },
  { id: 'chat', href: '/chat', label: `和${siteProfile.name}聊聊`, meaning: '有来源的数字分身对话', code: 'CONVERSATION', primary: true },
  { id: 'graph', href: '/graph', label: '关联图谱', meaning: '引用与关联的依据', code: 'CONNECTIONS', primary: false },
  { id: 'skills', href: '/skills', label: '技能库', meaning: 'Skills · 工作流与维护', code: 'SKILLS', primary: false },
  { id: 'agent', href: '/agent', label: '接入与 API', meaning: '读取 Skill 与接口', code: 'FOR AGENTS', primary: false },
] as const;
export type SiteSection = typeof siteNavigation[number]['id'];
