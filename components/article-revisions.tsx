import { articleRevisions } from '@/lib/article-revisions.mjs';
import './article-revisions.css';

const commitBase = 'https://github.com/youngjunning/youngjunning.com/commit/';

export default function ArticleRevisions({ articleId }: { articleId: string }) {
  const revisions = articleRevisions(articleId);
  if (!revisions.length) return null;
  return <details className="article-revisions">
    <summary>版本记录 <span>{revisions.length} 个版本 · 点击查看差异</span></summary>
    <ol>{revisions.map(revision => <li key={revision.commit}>
      <div><strong>{revision.label}</strong><time dateTime={revision.date}>{revision.date}</time></div>
      <p>{revision.summary}</p>
      <details className="article-diff"><summary>查看 diff</summary><pre aria-label={`${revision.label} 的文章变更片段`}><code>{revision.preview.split('\n').map((line, index) => <span key={index} className={line.startsWith('+') ? 'diff-add' : line.startsWith('-') ? 'diff-remove' : line.startsWith('@@') ? 'diff-hunk' : ''}>{line || ' '}</span>)}</code></pre><a href={commitBase + revision.commit} target="_blank" rel="noreferrer">在源码仓库查看完整提交 ↗</a></details>
    </li>)}</ol>
  </details>;
}
