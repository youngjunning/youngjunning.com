'use client';

import { useMemo, useState } from 'react';

type Order = { id: string; trip: string; route: string; time: string; price: number; status: '待支付' | '已取消' };
type Row = { depth: number; role: string; name?: string; suffix?: string; ownerId?: string; content?: string };
type Ref = { role: string; name: string; nth?: number; ownerId?: string; selector: string };
type Snapshot = { tree: string; refs: Record<string, Ref>; revision: number };
type Options = { interactive: boolean; compact: boolean; maxDepth: number; scope: 'all' | 'orders' };
type Selection = { key: string; role: string; name: string; ownerId?: string };

const initialOrders: Order[] = [
  { id: 'A-1042', trip: '周一出发', route: '杭州东 → 上海虹桥', time: '09:30', price: 268, status: '待支付' },
  { id: 'B-2086', trip: '周五出发', route: '杭州东 → 南京南', time: '18:20', price: 328, status: '待支付' },
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
    rows.push({ depth: base + 1, role: 'paragraph', content: `${order.route} · ${order.trip} ${order.time}` });
    rows.push({ depth: base + 1, role: 'paragraph', content: `状态：${order.status}` });
    rows.push({ depth: base + 1, role: 'paragraph', content: `应付：¥${order.price}` });
    if (order.status === '待支付') rows.push({ depth: base + 1, role: 'button', name: '取消', ownerId: order.id });
  }
  if (scope === 'all' && pendingId) {
    rows.push({ depth: 1, role: 'dialog', name: '确认取消' });
    rows.push({ depth: 2, role: 'paragraph', content: `取消后 ${pendingId} 无法继续支付` });
    rows.push({ depth: 2, role: 'button', name: '返回订单' });
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
  const [frozenSnapshot, setFrozenSnapshot] = useState<Snapshot | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState('先读完整快照，找到 B-2086 所属卡片与按钮。');
  const [messageKind, setMessageKind] = useState<'info' | 'warning' | 'success'>('info');
  const liveSnapshot = useMemo(() => buildSnapshot(orders, options, revision, pendingId), [orders, options, revision, pendingId]);
  const snapshot = frozenSnapshot ?? liveSnapshot;
  const selected = selection && (frozenSnapshot ? (snapshot.refs[selection.key] ? selection.key : null) : Object.entries(snapshot.refs).find(([, ref]) => ref.role === selection.role && ref.name === selection.name && ref.ownerId === selection.ownerId)?.[0] ?? null);
  const selectedRef = selected ? snapshot.refs[selected] : undefined;
  const target = selectedRef ? currentTarget(selectedRef, orders) : undefined;
  const selectedOrderId = selectedRef?.role === 'button' ? target?.id : selectedRef?.ownerId;
  const pendingOrder = orders.find(order => order.id === pendingId);
  const stale = Boolean(frozenSnapshot && snapshot.revision !== revision);

  function chooseRef(key: string) {
    const ref = snapshot.refs[key];
    if (ref) setSelection({ key, role: ref.role, name: ref.name, ownerId: ref.ownerId });
  }

  function selectOrderRef(orderId: string, role: Ref['role']) {
    const refs = Object.entries(snapshot.refs);
    const match = refs.find(([, ref]) => ref.ownerId === orderId && ref.role === role) ?? refs.find(([, ref]) => ref.ownerId === orderId);
    if (match) chooseRef(match[0]);
    else {
      setSelection(null);
      setMessage(`${orderId} 当前没有可用 ref；调整快照选项后可重新定位。`);
      setMessageKind('info');
    }
  }

  function updateOptions(next: Options) {
    setOptions(next);
    setFrozenSnapshot(null);
    setSelection(null);
    setMessage('选项已生效，TREE 和 REFS 已按当前页面重新计算。');
    setMessageKind('info');
  }

  function toggleFreeze() {
    if (frozenSnapshot) {
      setFrozenSnapshot(null);
      setMessage('已恢复实时观察。TREE 和 REFS 跟随当前页面更新。');
    } else {
      setFrozenSnapshot(liveSnapshot);
      setMessage('快照已冻结。现在可交换订单顺序，观察旧 ref 的定位风险。');
    }
    setMessageKind('info');
  }

  function reorder() {
    setOrders(current => [...current].reverse());
    setRevision(value => value + 1);
    setMessage(frozenSnapshot ? '订单顺序已交换。冻结快照的 nth 仍指向旧位置；恢复实时观察后会重新编号。' : '订单顺序已交换，TREE 和 REFS 已随当前页面重新编号。');
    setMessageKind(frozenSnapshot ? 'warning' : 'info');
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
    setMessage(`已找到 ${target.id} 的按钮。确认弹窗已出现${frozenSnapshot ? '，冻结快照保持旧内容' : '，TREE 和 REFS 已同步'}；操作尚未完成。`);
    setMessageKind('info');
  }

  function confirm() {
    if (!pendingId) return;
    if (!frozenSnapshot) selectOrderRef(pendingId, 'article');
    setOrders(current => current.map(order => order.id === pendingId ? { ...order, status: '已取消' } : order));
    setMessage(`${pendingId} 已在演示页面标记为“已取消”${frozenSnapshot ? '；冻结快照仍保留操作前的内容' : '，TREE 和 REFS 已同步显示新状态'}。`);
    setMessageKind('success');
    setPendingId(null);
    setRevision(value => value + 1);
  }

  function reset() {
    setOrders(initialOrders);
    setOptions(initialOptions);
    setRevision(0);
    setFrozenSnapshot(null);
    setSelection(null);
    setPendingId(null);
    setMessage('演示已重置。先读完整快照，找到 B-2086 所属卡片与按钮。');
    setMessageKind('info');
  }

  return <section className="snapshot-lab" id="lab" aria-labelledby="snapshot-lab-title">
    <div className="snapshot-section-heading"><div><p className="snapshot-eyebrow">LIVE DEMO / 订单场景</p><h2 id="snapshot-lab-title">亲手走一遍 snapshot</h2><p>目标：取消 <strong>B-2086</strong>，并确认结果。示例页面、TREE、REFS 和选项默认实时联动；需要观察旧引用时，再主动冻结快照。这里是本地教学模拟器，不运行上游 agent-browser。</p></div><button type="button" className="snapshot-reset" onClick={reset}>重置演示</button></div>

    <div className="snapshot-lab-grid">
      <div className="snapshot-browser-stage"><div className="snapshot-stage-label"><strong>独立示例网页</strong><span>example.local/orders · 与本站分离</span></div><div className="snapshot-browser-panel" aria-label="独立的示例订单页面">
        <div className="snapshot-panel-top"><span className="snapshot-window-dots" aria-hidden="true"><i /><i /><i /></span><span>example.local/orders</span><span>模拟站点</span></div>
        <div className="snapshot-browser-body"><div className={`snapshot-browser-title ${selectedRef?.role === 'heading' ? 'is-linked' : ''}`}><span>出行服务 / 订单中心</span><strong>我的订单</strong><p>查看行程与付款状态</p></div>
          <div className="snapshot-order-summary" aria-live="polite"><span><b>{orders.filter(order => order.status === '待支付').length}</b> 笔待支付</span><span>{orders.filter(order => order.status === '已取消').length} 笔已取消</span>{orders.every(order => order.status === '已取消') && <strong>暂无待支付订单</strong>}</div>
          <div className={`snapshot-order-list ${selectedRef?.role === 'region' ? 'is-linked' : ''}`}>{orders.map(order => <article id={`snapshot-example-order-${order.id}`} className={`snapshot-order ${order.status === '已取消' ? 'is-cancelled' : ''} ${selectedOrderId === order.id ? 'is-linked' : ''}`} aria-label={`${order.id}，${order.trip}`} key={order.id} tabIndex={0} onClick={() => selectOrderRef(order.id, 'article')} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); selectOrderRef(order.id, 'article'); } }}><div className="snapshot-order-top"><span className="snapshot-order-id">{order.id}</span><span className={`snapshot-order-status ${order.status === '已取消' ? 'is-cancelled' : ''}`}>{order.status}</span></div><h3>{order.route}</h3><div className="snapshot-order-meta"><span>{order.trip} · {order.time}</span><span>应付 <strong>¥{order.price}</strong></span></div>{selectedOrderId === order.id && <span className="snapshot-ref-match">快照 @{selected} 当前对应此单</span>}<div className="snapshot-order-bottom"><span>{order.status === '已取消' ? '订单已取消，无法继续支付' : '请核对行程后完成支付'}</span>{order.status === '待支付' && <button type="button" className={selectedOrderId === order.id && selectedRef?.role === 'button' ? 'is-linked' : ''} onClick={event => { event.stopPropagation(); selectOrderRef(order.id, 'button'); setPendingId(order.id); setRevision(value => value + 1); setMessage(`示例页已打开 ${order.id} 的确认弹窗${frozenSnapshot ? '；冻结快照仍保留旧内容' : '，TREE 和 REFS 已同步'}。这一步绕过了 ref。`); setMessageKind('info'); }}>取消</button>}</div></article>)}</div>
          {pendingOrder && <div className="snapshot-confirm" role="dialog" aria-modal="false" aria-label="确认取消"><strong>确认取消 {pendingOrder.id}？</strong><p>{pendingOrder.route} · {pendingOrder.trip} {pendingOrder.time}</p><p>取消后这笔订单无法继续支付。</p><div><button type="button" onClick={() => { setPendingId(null); setRevision(value => value + 1); setMessage(frozenSnapshot ? '弹窗已关闭，冻结快照保持旧内容。' : '弹窗已关闭，TREE 和 REFS 已同步。'); setMessageKind('info'); }}>返回订单</button><button type="button" onClick={confirm}>确认取消</button></div></div>}
        </div>
      </div></div>

      <div className="snapshot-controls-panel"><div className="snapshot-panel-top"><strong>本站观察台 · 快照选项</strong><span>模拟固定版本的核心过滤规则</span></div><div className="snapshot-controls-body">
        <label className="snapshot-check"><input type="checkbox" checked={options.interactive} onChange={event => updateOptions({ ...options, interactive: event.target.checked })} /><span><strong>-i 只看交互项</strong><small>订单号和状态会消失</small></span></label>
        <label className="snapshot-check"><input type="checkbox" checked={options.compact} onChange={event => updateOptions({ ...options, compact: event.target.checked })} /><span><strong>-c 压缩空结构</strong><small>移除无名包装层</small></span></label>
        <label className="snapshot-field"><span>-d 最大深度</span><select value={options.maxDepth} onChange={event => updateOptions({ ...options, maxDepth: Number(event.target.value) })}><option value={4}>完整深度</option><option value={3}>3 层</option><option value={2}>2 层</option><option value={1}>1 层</option></select></label>
        <label className="snapshot-field"><span>-s 采集范围</span><select value={options.scope} onChange={event => updateOptions({ ...options, scope: event.target.value as Options['scope'] })}><option value="all">整页</option><option value="orders">仅订单区域</option></select></label>
        <div className={`snapshot-live-state ${frozenSnapshot ? 'is-frozen' : ''}`} role="status"><i aria-hidden="true" />{frozenSnapshot ? '快照已冻结' : '实时联动中'}<span>{frozenSnapshot ? '页面变化不会改写 TREE / REFS' : '选项与页面变化立即更新 TREE / REFS'}</span></div>
        <button type="button" className="snapshot-generate" onClick={toggleFreeze} aria-pressed={Boolean(frozenSnapshot)}>{frozenSnapshot ? '恢复实时观察' : '冻结快照，观察旧 ref'} <span aria-hidden="true">↗</span></button>
        <p>默认无需手动生成。调整选项会立即生效；冻结后调整选项会自动恢复实时观察。每次观察都从 <code>e1</code> 重新编号。</p>
      </div></div>
    </div>

    <div className="snapshot-output-grid"><div className="snapshot-tree-panel"><div className="snapshot-output-head"><div><span>01 / TREE</span><h3>Agent 看到的文本</h3></div><small className={stale ? 'is-stale' : ''}>{stale ? '页面已变化 · 旧快照' : frozenSnapshot ? '快照已冻结 · 页面未变化' : '实时联动 · 当前页面'}</small></div><pre><code>{snapshot.tree.split('\n').map((line, index) => { const refKey = line.match(/\[ref=(e\d+)\]/)?.[1]; return refKey ? <button type="button" data-ref={refKey} className={`snapshot-tree-line ${selected === refKey ? 'is-linked' : ''}`} key={index} onClick={() => chooseRef(refKey)} aria-pressed={selected === refKey} aria-label={`选择 @${refKey}：${line.trim()}`}>{line}</button> : <span className="snapshot-tree-line" key={index}>{line}</span>; })}</code></pre><div className="snapshot-tree-foot">{snapshot.tree.split('\n').length} 行 · {Object.keys(snapshot.refs).length} 个 ref · token 约 {Math.ceil(snapshot.tree.length / 4)}（源码粗估）</div></div>
      <div className="snapshot-ref-panel"><div className="snapshot-output-head"><div><span>02 / REFS</span><h3>选择一个引用</h3></div></div><div className="snapshot-ref-list">{Object.entries(snapshot.refs).map(([key, ref]) => { const linkedOrderId = ref.role === 'button' ? currentTarget(ref, orders)?.id : ref.ownerId; return <button type="button" className={selected === key ? 'is-selected' : ''} key={key} onClick={() => chooseRef(key)} aria-pressed={selected === key} aria-controls={linkedOrderId ? `snapshot-example-order-${linkedOrderId}` : undefined}><code>@{key}</code><span>{ref.role} “{ref.name}”{ref.nth !== undefined ? ` · nth=${ref.nth}` : ''}</span></button>; })}{Object.keys(snapshot.refs).length === 0 && <p>当前过滤条件下没有可选引用，调整选项会立即更新。</p>}</div><div className="snapshot-ref-detail">{selectedRef ? <><p>快照里的目标：<strong>{selectedRef.ownerId ?? '页面内容或区域'}</strong></p><p>页面联动：<strong>{selectedRef.role === 'button' ? (target?.id ?? '当前无对应按钮') : selectedRef.role === 'article' ? (orders.find(order => order.id === selectedRef.ownerId)?.id ?? '页面已无此订单') : selectedRef.role === 'heading' ? '我的订单标题' : selectedRef.role === 'region' ? '订单列表区域' : '非订单目标'}</strong></p><code>{selectedRef.selector}{selectedRef.nth !== undefined ? `.nth(${selectedRef.nth})` : ''}</code><button type="button" onClick={runRef} disabled={selectedRef.role !== 'button' || selectedRef.name !== '取消'}>用 @{selected} 查找并打开确认 <span aria-hidden="true">→</span></button></> : <p>点 TREE 中带 ref 的行或 REFS 中的条目，查看它对应的示例页面对象。</p>}</div></div></div>

    <div className={`snapshot-feedback ${messageKind}`} role="status"><span>{messageKind === 'warning' ? '!' : messageKind === 'success' ? '✓' : 'i'}</span><p>{message}</p><button type="button" onClick={reorder} disabled={orders.every(order => order.status === '已取消')}>交换订单顺序</button></div>
    <p className="snapshot-lab-caption">实时联动只是本站教学界面的观察方式；上游 snapshot 仍需显式调用。冻结快照可模拟动作前后不重新观察的风险。订单身份检查与过期提示是演示附加的保护逻辑；固定源码的 RefMap 只保存 selector、role、name 和可选 nth。输出按该规则构造，不是实际 Playwright 运行结果。</p>
  </section>;
}
