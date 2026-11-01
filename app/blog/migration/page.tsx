import Link from 'next/link';
import migration from '@/content/blog-migration-2026-11-01.json';
export const metadata = { title: '博客迁移清单', description: '238 篇历史博客的迁移结果，以及未迁移文章的逐篇原因。' };
export default function MigrationPage() {
  const included = migration.entries.filter(item => item.status !== 'excluded');
  const excluded = migration.entries.filter(item => item.status === 'excluded');
  return <article className="detail prose migration-report">
    <Link className="back-link" href="/blog">← 返回文章</Link>
    <h1>博客迁移清单</h1>
    <p>旧官网知识库的迁移另见 <Link href="/blog/website-migration">官网迁移清单：11 篇笔记、2 份参考资料及 80 份未迁移材料</Link>。</p>
    <p>2026-11-01 核对 blog.zisheng.pro 的 {migration.counts.reviewed} 篇文章：新增 {migration.counts.migrated} 篇，更新已有 {migration.counts.updated} 篇，未迁移 {migration.counts.excluded} 篇。旧博客仓库已归档，原部署已停止；官网与博客统一由 youngjunning.com 承接，归档源码继续保留文章出处。</p>
    <p>保留具体实现、诊断、技术取舍、长期方法与个人复盘。80 篇正文逐字保留，1 篇仅替换一处历史 npm 令牌；原始日期、署名和引用保留；历史版本的操作与结论按当时语境阅读。未迁移不等于没有价值，下面逐篇列出这次的取舍。</p>
    <p><a href="#excluded">查看未迁移清单 ↓</a> · <a href="#included">查看已迁移清单 ↓</a></p>
    <h2 id="excluded">未迁移：{excluded.length} 篇</h2>
    <table><thead><tr><th>文章</th><th>原因</th></tr></thead><tbody>{excluded.map(item => <tr key={item.sourceFile}><td><a href={item.source} target="_blank" rel="noreferrer">{item.title}</a></td><td>{item.reason}</td></tr>)}</tbody></table>
    <h2 id="included">已迁移与更新：{included.length} 篇</h2>
    <table><thead><tr><th>文章</th><th>保留理由</th></tr></thead><tbody>{included.map(item => <tr key={item.sourceFile}><td><Link href={'/blog/' + item.id}>{item.title}</Link></td><td>{item.reason}</td></tr>)}</tbody></table>
  </article>;
}
