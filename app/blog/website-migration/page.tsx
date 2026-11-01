import Link from 'next/link';
import migration from '@/content/website-migration-2026-11-01.json';
import assets from '@/content/website-migration-assets-2026-11-01.json';

export const metadata = { title: '官网知识库迁移清单', description: '93 份历史知识库材料的取舍：迁入 11 篇，整理 2 份参考资料，逐项说明 80 份未迁移材料的原因。' };
export default function WebsiteMigrationPage() {
  const included = migration.entries.filter(item => item.status === 'imported');
  const references = migration.entries.filter(item => item.status === 'reference');
  const excluded = migration.entries.filter(item => item.status === 'excluded');
  const resources = Object.values(assets.resources);
  return <article className="detail prose migration-report">
    <Link className="back-link" href="/blog/migration">← 返回迁移清单</Link>
    <h1>官网知识库迁移清单</h1>
    <p>{migration.date} 核对原官网的 {migration.counts.reviewed} 份页面源稿与学习草稿：迁入 {included.length} 篇，{references.length} 份整理为参考资料，{excluded.length} 份不迁移。</p>
    <p>保留连续解释、具体代码、听写练习和长期词汇积累。空稿、只有标题的题解、重复概览及未校订材料不作为文章迁移。学习笔记保留原有引用和署名，不把译文中的第一人称或实验成果认作本人经历。发布日期不详的材料不补造日期。</p>
    <p>项目配置、未公开个人材料、账号与凭证未复制到公开仓库。原始位置与工作区记录仅留本机迁移归档。</p>
    <p><a href="#included">已迁移 ↓</a> · <a href="#references">参考资料 ↓</a> · <a href="#excluded">未迁移及原因 ↓</a></p>
    <h2 id="included">已迁移：{included.length} 篇</h2>
    <table><thead><tr><th>文章</th><th>理由与调整</th></tr></thead><tbody>{included.map(item => <tr key={item.sourceKey}><td><Link href={'/blog/' + item.id}>{item.title}</Link></td><td>{item.reason}{item.adjustments?.length ? <p>{item.adjustments.join(' ')}</p> : <p>正文按原稿保留。</p>}</td></tr>)}</tbody></table>
    <h2 id="references">转为参考资料：{references.length} 份</h2>
    <table><thead><tr><th>材料</th><th>处理方式</th></tr></thead><tbody>{references.map(item => <tr key={item.sourceKey}><td>{item.title}</td><td>{item.reason}</td></tr>)}</tbody></table>
    <p>新增 <a href="https://javascript.info/" target="_blank" rel="noreferrer">JavaScript.info</a> 与 <a href="https://github.com/microsoft/generative-ai-with-javascript" target="_blank" rel="noreferrer">微软 JavaScript 生成式 AI 课程</a> 的原始入口；React 和 Patterns.dev 沿用已有收藏。可在 <Link href="/favorites">收藏</Link> 中查看。</p>
    <h2 id="excluded">未迁移：{excluded.length} 份</h2>
    <table><thead><tr><th>原材料</th><th>原因</th></tr></thead><tbody>{excluded.map(item => <tr key={item.sourceKey}><td>{item.title}</td><td>{item.reason}</td></tr>)}</tbody></table>
    <h2>图片与校验范围</h2>
    <p>正文共 {resources.length} 个图片地址，已保存 {resources.filter(item => item.status === 'local').length} 个；其余 {resources.filter(item => item.status !== 'local').length} 个保留原链接并显示缺图说明。各篇使用独立生成的阅读笔记系列封面，正文配图保留原位置。</p>
    <p>正文与图片有内容指纹校验；外部嵌入改为原始链接。迁移验收不表示重新验证了全部历史译文和技术结论。</p>
  </article>;
}
