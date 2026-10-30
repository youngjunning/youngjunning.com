import { getContent } from '@/lib/content';
import { FavoriteList } from '@/components/collection';
export const metadata = { title: '收藏夹' };
export default function Favorites() { return <><header className="page-head"><span className="eyebrow">WORTH COMING BACK TO</span><h1>值得再看一次。</h1><p>收藏项目、工具和知识资料，标清用途与出处。会话发现单独标注；收藏本身不代表本人参与、使用或掌握。</p></header><section className="page-body"><FavoriteList favorites={getContent().favorites} /></section></>; }
