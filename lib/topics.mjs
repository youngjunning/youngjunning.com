// Classify the article's main question; technologies and projects belong in tags.
export const topics = [
  { id: 'principles', label: '原理解析', description: '机制是什么，系统如何运转', color: '#57857b' },
  { id: 'architecture', label: '架构设计', description: '边界如何划分，方案怎样取舍', color: '#ad8959' },
  { id: 'engineering', label: '工程实践', description: '能力如何实现、验证与交付', color: '#6d86ad' },
  { id: 'diagnostics', label: '诊断优化', description: '问题如何定位，效果怎样改善', color: '#ad7668' },
  { id: 'reflections', label: '复盘思考', description: '经历带来什么经验与判断', color: '#648e65' },
];
export const topicIds = topics.map((topic) => topic.id);
export const defaultTopic = 'engineering';
