export const RUBRIC_VERSION = 'agents-md-v1';
export const RUBRIC = [
  { id: 'clarity', label: '目标与范围', description: '对象、适用范围和上下文是否清楚，是否区分全局与项目责任' },
  { id: 'precedence', label: '优先级与一致性', description: '继承、覆盖和例外是否明确，有无冲突或互相阻塞的要求' },
  { id: 'actionability', label: '可执行性', description: '动作、触发条件、输入与完成条件是否具体可执行' },
  { id: 'verification', label: '验证与边界', description: '是否定义验证、权限、失败处理和交付证据，是否避免越权' },
  { id: 'maintainability', label: '维护与信息密度', description: '是否聚焦，减少重复、易过期内容与无关上下文，引用是否有明确入口' },
];
export function evaluationIsCurrent(entry, evaluation, configs) {
  const parent = configs.find(c => c.id === entry.parentId);
  return Boolean(evaluation && evaluation.hash === entry.revisions[0].hash && evaluation.parentHash === (parent?.revisions[0].hash ?? null) && evaluation.rubricVersion === RUBRIC_VERSION);
}
