import { getContent } from '@/lib/content';
import { RecordList } from '@/components/collection';
export const metadata = { title: '个人记录' };
export default function Records() { return <><header className="page-head"><span className="eyebrow">THE MEMORY ARCHIVE</span><h1>经历与判断，都有来处。</h1><p>留住具体场景中的选择与变化。发生时间、录入时间和来源分别保留，尚未验证的结果保持未知。</p></header><section className="page-body"><RecordList records={getContent().records} /></section></>; }
