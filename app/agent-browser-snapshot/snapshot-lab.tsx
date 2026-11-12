'use client';

import { useState } from 'react';

type Order = { id: string; trip: string; status: '待支付' | '已取消' };
type Row = { depth: number; role: string; name?: string; suffix?: string; ownerId?: string; content?: string };
type Ref = { role: string; name: string; nth?: number; ownerId?: string; selector: string };
type Snapshot = { tree: string; refs: Record<string, Ref>; revision: number };
type Options = { interactive: boolean; compact: boolean; maxDepth: number; scope: 'all' | 'orders' };

const initialOrders: Order[] = [
  { id: 'A-1042', trip: '周一出发', status: '待支付' },
  { id: 'B-2086', trip: '周五出发', status: '待支付' },
];
const initialOptions: Options = { interactive: false, compact: false, maxDepth: 4, scope: 'all' };
const interactiveRoles = new Set(['button', 'link', 'textbox']);
const contentRoles = new Set(['heading', 'article', 'region']);
const structuralRoles = new Set(['main', 'group']);

function ariaRows(orders: Order[], scope: Options['scope'], pendingId: string | null): Row[] {
  const rows: Row[] = scope === 'all' ? [
    { depth: 0, role: 'main' },
    { depth: 1, role: 'heading', name: '我的订单', suffix: '[level=1]' },
    { depth: 1, role: 'group' },
    { depth: 2, role: 'region', name: '订单列表' },
  ] : [{ depth: 0, role: 'region', name: '订单列表' }];
  const base = scope === 'all' ? 3 : 1;
  for (const order of orders) {
    rows.push({ depth: base, role: 'article', name: `${order.id}，${order.trip}`, ownerId: order.id });
    rows.push({ depth: base + 1, role: 'paragraph', content: `状态：${order.status}` });
    if (order.status === '待支付') rows.push({ depth: base + 1, role: 'button', name: '取消', ownerId: order.id });
  }
  if (scope === 'all' && pendingId) {
    rows.push({ depth: 1, role: 'dialog', name: '确认取消' });
    rows.push({ depth: 2, role: 'paragraph', content: `即将取消 ${pendingId}` });
    rows.push({ depth: 2, role: 'button', name: '确认取消' });
  }
  return rows;
}

function buildSnapshot(orders: Order[], options: Options, revision: number, pendingId: string | null): Snapshot {
  const refs: Record<string, Ref> = {};
  const counts = new Map<string, number>();
  const duplicates = new Map<string, string[]>();
  const result: string[] = [];
  let refNumber = 0;
  for (const row of ariaRows(orders, options.scope, pendingId)) {
    if (row.depth > options.maxDepth) continue;
    if (options.interactive && !interactiveRoles.has(row.role)) continue;
    if (options.compact && structuralRoles.has(row.role) && !row.name) continue;
    const prefix = options.interactive ? '- ' : `${'  '.repeat(row.depth)}- `;
    let line = `${prefix}${row.role}`;
    if (row.name) line += ` "${row.name}"`;
    if (row.content) line += `: ${row.content}`;
    const shouldRef = interactiveRoles.has(row.role) || (!options.interactive && contentRoles.has(row.role) && Boolean(row.name));
    if (shouldRef) {
      const name = row.name ?? '';
      const key = `${row.role}:${name}`;
      const nth = counts.get(key) ?? 0;
      counts.set(key, nth + 1);
      const ref = `e${++refNumber}`;
      refs[ref] = { role: row.role, name, nth, ownerId: row.ownerId, selector: `getByRole('${row.role}', { name: ${JSON.stringify(name)}, exact: true })` };
      duplicates.set(key, [...(duplicates.get(key) ?? []), ref]);
      line += ` [ref=${ref}]`;
      if (nth > 0) line += ` [nth=${nth}]`;
    }
    if (row.suffix) line += ` ${row.suffix}`;
    result.push(line);
  }
  for (const ids of duplicates.values()) if (ids.length === 1) delete refs[ids[0]].nth;
  const tree = result.length ? result.join('\n') : '(no interactive elements)';
  return { tree, refs, revision };
}

function currentTarget(ref: Ref, orders: Order[]): Order | undefined {
  if (ref.role !== 'button' || ref.name !== '取消') return undefined;
  return orders.filter(order => order.status === '待支付')[ref.nth ?? 0];
}

export default function SnapshotLab() {
  const [orders, setOrders] = useState(initialOrders);
  const [options, setOptions] = useState(initialOptions);
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState(() => buildSnapshot(initialOrders, initialOptions, 0, null));
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState('先读完整快照，找到 B-2086 所属卡片与按钮。');
  const [messageKind, setMessageKind] = useState<'info' | 'warning' | 'success'>('info');
  const selectedRef = selected ? snapshot.refs[selected] : undefined;
  const target = selectedRef ? currentTarget(selectedRef, orders) : undefined;
  const stale = snapshot.revision !== revision;

  function generate() {
    setSnapshot(buildSnapshot(orders, options, revision, pendingId));
    setSelected(null);
    setMessage('快照已更新。先确认目标订单，再选择它的“取消”引用。');
    setMessageKind('info');
  }

  function reorder() {
    setOrders(current => [...current].reverse());
    setRevision(value => value + 1);
    setMessage('订单顺序已交换。旧 ref 的 nth 仍指向原顺序位置，请检查目标或重新生成快照。');
    setMessageKind('warning');
  }

  function runRef() {
    if (!selectedRef || selectedRef.role !== 'button' || selectedRef.name !== '取消') return;
    if (!target) {
      setMessage('该按钮已不在当前页面。请重新观察。');
      setMessageKind('warning');
      return;
    }
    if (target.id !== selectedRef.ownerId) {
      setMessage(`已拦截：旧 ${selected} 原属于 ${selectedRef.ownerId}，现在 role/name/nth 会命中 ${target.id}。上游定位配方不保存订单 ID；这里的拦截是演示附加的业务校验。`);
      setMessageKind('warning');
      return;
    }
    setPendingId(target.id);
    setRevision(value => value + 1);
    setMessage(`已找到 ${target.id} 的按钮。现在出现确认弹窗；操作尚未完成。`);
    setMessageKind('info');
  }

  function confirm() {
    if (!pendingId) return;
    setOrders(current => current.map(order => order.id === pendingId ? { ...order, status: '已取消' } : order));
    setMessage(`${pendingId} 已在演示页面标记为“已取消”。请重新生成快照，核对新状态。`);
    setMessageKind('success');
    setPendingId(null);
    setRevision(value => value + 1);
  }

  function reset() {
    setOrders(initialOrders);
    setOptions(initialOptions);
    setRevision(0);
    setSnapshot(buildSnapshot(initialOrders, initialOptions, 0, null));
    setSelected(null);
    setPendingId(null);
    setMessage('演示已重置。先读完整快照，找到 B-2086 所属卡片与按钮。');
    setMessageKind('info');
  }

  return <section className="snapshot-lab" id="lab" aria-labelledby="snapshot-lab-title">
    <div className="snapshot-section-heading"><div><p className="snapshot-eyebrow">LIVE DEMO / 订单场景</p><h2 id="snapshot-lab-title">亲手走一遍 snapshot</h2><p>目标：取消 <strong>B-2086</strong>，并确认结果。这里是本地教学模拟器，不运行上游 agent-browser。</p></div><button type="button" className="snapshot-reset" onClick={reset}>重置演示</button></div>

    <div className="snapshot-lab-grid">
      <div className="snapshot-browser-panel">
        <div className="snapshot-panel-top"><span className="snapshot-window-dots" aria-hidden="true"><i /><i /><i /></span><span>example.local/orders</span><span>示例页面</span></div>
        <div className="snapshot-browser-body"><div className="snapshot-browser-title"><span>订单中心</span><strong>我的订单</strong><p>选择正确的业务对象后再操作。</p></div>
          <div className="snapshot-order-list">{orders.map(order => <article className={`snapshot-order ${order.status === '已取消' ? 'is-cancelled' : ''}`} aria-label={`${order.id}，${order.trip}`} key={order.id}><div><span className="snapshot-order-id">{order.id}</span><h3>{order.trip}</h3><p>状态：<b>{order.status}</b></p></div>{order.status === '待支付' && <button type="button" onClick={() => { setPendingId(order.id); setRevision(value => value + 1); setMessage(`手动打开了 ${order.id} 的确认弹窗；这一步绕过了 ref。`); setMessageKind('info'); }}>取消</button>}</article>)}</div>
          {pendingId && <div className="snapshot-confirm" role="dialog" aria-modal="false" aria-label="确认取消"><strong>确认取消 {pendingId}？</strong><p>演示只修改本页状态，不会产生真实订单操作。</p><div><button type="button" onClick={() => { setPendingId(null); setRevision(value => value + 1); }}>返回</button><button type="button" onClick={confirm}>确认取消</button></div></div>}
        </div>
      </div>

      <div className="snapshot-controls-panel"><div className="snapshot-panel-top"><strong>快照选项</strong><span>模拟固定版本的核心过滤规则</span></div><div className="snapshot-controls-body">
        <label className="snapshot-check"><input type="checkbox" checked={options.interactive} onChange={event => setOptions(current => ({ ...current, interactive: event.target.checked }))} /><span><strong>-i 只看交互项</strong><small>订单号和状态会消失</small></span></label>
        <label className="snapshot-check"><input type="checkbox" checked={options.compact} onChange={event => setOptions(current => ({ ...current, compact: event.target.checked }))} /><span><strong>-c 压缩空结构</strong><small>移除无名包装层</small></span></label>
        <label className="snapshot-field"><span>-d 最大深度</span><select value={options.maxDepth} onChange={event => setOptions(current => ({ ...current, maxDepth: Number(event.target.value) }))}><option value={4}>完整深度</option><option value={3}>3 层</option><option value={2}>2 层</option><option value={1}>1 层</option></select></label>
        <label className="snapshot-field"><span>-s 采集范围</span><select value={options.scope} onChange={event => setOptions(current => ({ ...current, scope: event.target.value as Options['scope'] }))}><option value="all">整页</option><option value="orders">仅订单区域</option></select></label>
        <button type="button" className="snapshot-generate" onClick={generate}>生成快照 <span aria-hidden="true">↗</span></button>
        <p>调整选项后点击“生成快照”。每次生成都从 <code>e1</code> 重新编号。</p>
      </div></div>
    </div>

    <div className="snapshot-output-grid"><div className="snapshot-tree-panel"><div className="snapshot-output-head"><div><span>01 / TREE</span><h3>Agent 看到的文本</h3></div><small className={stale ? 'is-stale' : ''}>{stale ? '页面已变化 · 旧快照' : '与当前页面一致'}</small></div><pre><code>{snapshot.tree}</code></pre><div className="snapshot-tree-foot">{snapshot.tree.split('\n').length} 行 · {Object.keys(snapshot.refs).length} 个 ref · token 约 {Math.ceil(snapshot.tree.length / 4)}（源码粗估）</div></div>
      <div className="snapshot-ref-panel"><div className="snapshot-output-head"><div><span>02 / REFS</span><h3>选择一个引用</h3></div></div><div className="snapshot-ref-list">{Object.entries(snapshot.refs).map(([key, ref]) => <button type="button" className={selected === key ? 'is-selected' : ''} key={key} onClick={() => setSelected(key)} aria-pressed={selected === key}><code>@{key}</code><span>{ref.role} “{ref.name}”{ref.nth !== undefined ? ` · nth=${ref.nth}` : ''}</span></button>)}{Object.keys(snapshot.refs).length === 0 && <p>当前过滤条件下没有可选引用。</p>}</div><div className="snapshot-ref-detail">{selectedRef ? <><p>快照里的目标：<strong>{selectedRef.ownerId ?? '内容或非订单操作'}</strong></p><p>当前定位结果：<strong>{target?.id ?? '无可执行订单目标'}</strong></p><code>{selectedRef.selector}{selectedRef.nth !== undefined ? `.nth(${selectedRef.nth})` : ''}</code><button type="button" onClick={runRef} disabled={selectedRef.role !== 'button' || selectedRef.name !== '取消'}>用 @{selected} 查找并打开确认 <span aria-hidden="true">→</span></button></> : <p>选中“取消”引用，查看它如何定位当前页面。</p>}</div></div></div>

    <div className={`snapshot-feedback ${messageKind}`} role="status"><span>{messageKind === 'warning' ? '!' : messageKind === 'success' ? '✓' : 'i'}</span><p>{message}</p><button type="button" onClick={reorder} disabled={orders.every(order => order.status === '已取消')}>交换订单顺序</button></div>
    <p className="snapshot-lab-caption">演示的订单身份检查与过期提示是教学保护逻辑；固定源码的 RefMap 只保存 selector、role、name 和可选 nth。输出是按该规则构造的示意，不是实际 Playwright 运行结果。</p>
  </section>;
}
