import { ArticleTemplate } from '@/components/article-template';
export const metadata = { title: '文章草稿' };
export default function Manage() { return <><header className="page-head"><span className="eyebrow">A PLACE TO START</span><h1>写下一篇。</h1><p>生成包含稳定 ID、真实日期和主题的草稿模板。下载到本机后完成正文、封面与受众检查，再进入发布流程。</p></header><section className="page-body"><ArticleTemplate /></section></>; }
