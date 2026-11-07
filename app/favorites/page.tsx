import { getSiteTheme } from '@/lib/site-theme';
import { StatechartFavorites } from '@/components/statechart/pages';
import Shell from '@/components/shell';
import FavoriteCollection from '@/components/lucian/favorite-collection';
import { getFavoriteStore } from '@/lib/favorites';
export const metadata = { title: '百宝箱' };
export default async function FavoritesPage() {
  if (await getSiteTheme() === 'statechart') return <StatechartFavorites />;
  return <Shell active="favorites"><section className="page-intro"><div className="eyebrow">WORTH RETURNING TO</div><h1>百宝箱<span> / 资源与知识笔记</span></h1><p>按关注的问题找资料、工具、概念和方法。每条内容保留来源与表达归属，真实使用记录连接具体项目。</p></section><FavoriteCollection favorites={getFavoriteStore().favorites}/></Shell>;
}
