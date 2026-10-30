import Link from 'next/link';
export default function NotFound() { return <div className="not-found"><span className="eyebrow">404 / NOT IN THE ARCHIVE</span><h1>这里还没有记录。</h1><p>这个地址不存在，或内容尚未公开。</p><Link href="/">回到首页 ↗</Link></div>; }
