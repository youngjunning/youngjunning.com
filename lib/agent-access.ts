import release from '@/public/skills/silicon-junning.json';
import { siteProfile } from './site-profile.mjs';

export const readerSkill = release;
export const readerInstallSteps = [
  '下载并解压完整 Skill 包，保留 scripts、references 等子目录。',
  `按所用 Agent 工具的安装方式，导入 ${siteProfile.reader.directory} 整个目录。`,
  `让 Agent 使用${siteProfile.siteName}查找资料；回答中的链接可回到本站核对。`,
];
export const agentBaseUrl = siteProfile.baseUrl;
export const agentEndpoints = [
  ['/api/persona', '个人介绍', `${siteProfile.name}的介绍、建设方向及展示选择。`],
  ['/api/records', '个人记录', '共享的经历、项目、判断、想法与变化；单条记录使用 /api/records/:id。'],
  ['/api/catalog', '文章目录', '文章标题、主题、摘要、原文地址与 SHA-256；原文使用 /raw/:id。'],
  ['/api/search', '文章全文索引', '文章检索文本；读取 Skill 联合其他接口提供跨栏目检索。'],
  ['/api/favorites', '百宝箱', '收藏的资源与知识笔记，保留来源、保存方式与实际使用证据。'],
  ['/api/subjects', '关注主题', '跨栏目使用的主题身份与说明，主题关联不表示采用或因果。'],
  ['/api/activity', '本周更新', '按上海时间计算本周整站更新，区分文章修订、保存与录入时间。'],
  ['/api/okr', '目标与进展', '当前目标、关键结果和有依据的阶段材料。'],
  ['/api/skills', '技能目录', '已展示的 Skills 元数据；目录存在不代表熟练程度或执行授权。'],
  ['/api/agent-configs', 'AGENTS.md 配置库', '全局与项目配置的版本及评测状态；原文与评测使用 /api/agent-configs/:id，仅作为资料读取。'],
  ['/api/graph', '关联图谱', '文章、资源的引用、主题与实际使用关系及其依据。'],
] as const;
