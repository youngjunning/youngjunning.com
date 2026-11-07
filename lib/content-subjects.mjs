// Reading subjects are independent from article topics (the question an article answers).
export const contentSubjects = [
  { id: 'grounding', label: '视觉定位', description: '从截图、目标描述到位置与动作复核', color: '#956a43' },
  { id: 'browser', label: '浏览器与交互', description: '浏览器架构、页面语义与交互', color: '#4d7e89' },
  { id: 'memory', label: '记忆与知识系统', description: '个人记忆、来源、知识组织与评测', color: '#8866aa' },
  { id: 'engineering', label: '软件工程', description: '开发工作流、架构边界与验证', color: '#617e61' },
  { id: 'business', label: '产品与业务', description: '实际场景、产品取舍与合作方法', color: '#a16a59' },
  { id: 'design', label: '设计与表达', description: '设计指导、组件、视觉与表达', color: '#af7c96' },
  { id: 'infra', label: '执行环境与基础设施', description: '系统环境、设备、虚拟化与运行条件', color: '#6d789d' },
  { id: 'agents', label: 'Agent 与自动化', description: 'Agent 产品、工具、编排与任务执行', color: '#668774' },
];
/** @param {string} id @returns {string} */
export const subjectLabel = id => contentSubjects.find(subject => subject.id === id)?.label || id;

// A browsing hint for existing prose, never proof of adoption, authorship or a causal link.
/** @param {{ title?: string, tags?: string[], text?: string, summary?: string }} input
 * @returns {string[]}
 */
export function inferSubjects({ title = '', tags = [], text = '', summary = '' } = {}) {
  const value = [title, ...tags, text, summary].join(' ');
  /** @type {Array<[string, RegExp]>} */
  const rules = [
    ['grounding', /grounding|Jev|Noul|\bBox\b|视觉定位|目标边界框|坐标换算|图像定位/i],
    ['browser', /browser|Chromium|Electron|浏览器|Accessibility|AX Tree|ARIA|tabindex|VoiceOver|WebContents|webview|CDP/i],
    ['memory', /memory|记忆|知识库|知识管理|LLM Wiki|GBrain|Muse|LongMemEval/i],
    ['engineering', /软件工程|架构|SDK|runtime|代码评审|Copilot|PoC|概念验证|补丁|IPC|开发工具|评测/i],
    ['business', /运营|业务调研|合作|产品设计|用户价值|业务场景|数字员工|访客|计数器/i],
    ['design', /设计|\bUI\b|组件|可视化|视觉来源|statechart|视频生成|多模态创作/i],
    ['infra', /Linux|Android|iOS|Simulator|Multipass|Lima|rootfs|Binder|虚拟机|容器|执行环境|内核|真机|设备/i],
    ['agents', /Agent|自动化|Computer Use|任务编排|数字员工|MCP|Jev|Noul/i],
  ];
  return rules.filter(([, pattern]) => pattern.test(value)).map(([id]) => id);
}
