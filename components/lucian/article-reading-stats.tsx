// Lucian UX/UI Prompt #058 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#058
import { readingMinutes } from '@/lib/article-reading.mjs';
import './article-reading-stats.css';

// Reuse #058's compact article-header metadata in the list and full article.
export default function ArticleReadingStats({ words }: { words: number }) {
  return <span className="article-reading-stats" title="字数按正文非空白字符统计，含代码；阅读时长按每分钟约 500 字估算。">
    <span>{words.toLocaleString('zh-CN')} 字</span><span aria-hidden="true">·</span><span>阅读时间 {readingMinutes(words)} 分钟</span>
  </span>;
}
