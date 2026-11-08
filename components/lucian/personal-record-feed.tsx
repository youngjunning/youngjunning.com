// Lucian UX/UI Prompt #271 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#271
'use client';

import Link from 'next/link';


import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { recordKinds, projectStatuses } from '@/lib/record-kinds';
import type { PersonalRecord } from '@/lib/record-types';
import ListPagination from './list-pagination';
import './lucian-271.css';
import './record-feed.css';

type Kind = (typeof recordKinds)[number]['id'];
const colors: Record<PersonalRecord['kind'], string> = { experience: 'var(--style-accent)', project: 'var(--style-secondary)', judgment: 'var(--style-secondary)', change: 'var(--style-accent)', thought: 'var(--style-accent)' };
const PAGE_SIZE = 12;

export default function PersonalRecordFeed({ records, allRecords = records, initialKind = 'all', detail = false }: { records: PersonalRecord[]; allRecords?: PersonalRecord[]; initialKind?: Kind; detail?: boolean }) {
  const [selected, setSelected] = useState<Kind>(initialKind);
  const [page, setPage] = useState(1);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const filterScroll = useRef<HTMLDivElement>(null);
  const selection = recordKinds.findIndex((kind) => kind.id === selected);
  const byId = new Map(allRecords.map((record) => [record.id, record]));
  const filteredRecords = detail || selected === 'all' ? records : records.filter((record) => record.kind === selected);
  const pageCount = detail ? 1 : Math.ceil(filteredRecords.length / PAGE_SIZE);
  const visibleRecords = detail ? filteredRecords : filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => {
    const container = filterScroll.current;
    const button = buttons.current[selection];
    if (!container || !button) return;
    const frame = container.getBoundingClientRect(), item = button.getBoundingClientRect();
    if (item.left < frame.left) container.scrollBy({ left: item.left - frame.left - 6 });
    else if (item.right > frame.right) container.scrollBy({ left: item.right - frame.right + 6 });
  }, [selection]);
  function select(index: number) {
    setSelected(recordKinds[index].id);
    setPage(1);
  }
  function changePage(next: number) {
    setPage(next);
    filterScroll.current?.scrollIntoView({ block: 'start' });
  }
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!direction && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? recordKinds.length - 1 : (index + direction + recordKinds.length) % recordKinds.length;
    select(next);
    buttons.current[next]?.focus();
  }
  return <div className="ux u271 personal-record-feed memory-feed">
    {!detail && <div className="u271-hd"><div className="record-feed-heading"><div><h3>个人记录</h3><p>保留发生的事、当时的判断，以及后来的变化。</p></div></div>
      <div className="record-filter-scroll" ref={filterScroll}><div className="u271-cs" role="radiogroup" aria-label="按记录类型筛选"><span className="u271-pl" aria-hidden="true" style={{ width: `calc((100% - ${recordKinds.length * 2 + 4}px) / ${recordKinds.length})`, transform: `translateX(calc(${selection * 100}% + ${selection * 2}px))` }} />{recordKinds.map((kind, index) => <button className={`u271-ch ${selected === kind.id ? 'is-on' : ''}`} key={kind.id} ref={(node) => { buttons.current[index] = node; }} type="button" role="radio" aria-checked={selected === kind.id} tabIndex={selected === kind.id ? 0 : -1} onClick={() => select(index)} onKeyDown={(event) => onKeyDown(event, index)}><span>{kind.label}</span><i>{kind.id === 'all' ? records.length : records.filter((record) => record.kind === kind.id).length}</i></button>)}</div></div>
    </div>}
    <div className="u271-sc" aria-label="个人记录列表"><div className="u271-tl">{visibleRecords.map((record) => {
      const relationIds = [...new Set([record.projectId, ...(record.kind === 'change' ? [record.subjectId] : []), ...record.relatedIds].filter((id): id is string => id !== null))];
      return <div className="u271-en" key={record.id}><div><article className="u271-in" style={{ '--c': colors[record.kind] } as CSSProperties}>
        <span className="u271-dt" aria-hidden="true" /><div className="u271-mt"><b>{record.kind === 'experience' ? record.period : record.date || '发生时间待补充'}</b><span className="u271-tg">{recordKinds.find((kind) => kind.id === record.kind)?.label}</span></div>
        <h4>{detail ? record.title : <Link href={`/records/${record.id}`}>{record.title} ↗</Link>}</h4><p className="record-feed-text">{record.text}</p>
        {record.kind === 'project' && <><p><strong>我的参与：</strong>{record.role}</p><p><strong>项目状态：</strong>{projectStatuses[record.status]}</p>{detail && <><p><strong>目标：</strong>{record.goal}</p><p><strong>已记录结果：</strong>{record.outcomes.length ? record.outcomes.join('；') : '尚未补充结果，不从介绍中推断完成情况。'}</p></>}</>}
        {record.kind === 'judgment' && <><p><strong>判断依据：</strong>{record.basis}</p>{detail && <><p><strong>考虑过的选择：</strong>{record.alternatives.length ? record.alternatives.join('；') : '尚未记录'}</p><p><strong>后续结果：</strong>{record.outcome || '尚未记录'}</p></>}</>}
        {record.kind === 'change' && <div className="record-change"><p><strong>之前：</strong>{record.before}</p><p><strong>之后：</strong>{record.after}</p><p><strong>变化原因：</strong>{record.reason}</p></div>}
        <p className="record-feed-context">{record.context}</p>
        {relationIds.length > 0 && <div className="record-relations">{relationIds.map((id) => <Link key={id} href={`/records/${id}`}>{byId.get(id)?.title || '关联记录'} ↗</Link>)}</div>}
        {record.articleId && <Link className="record-feed-source" href={`/docs/${record.articleId}`}>阅读相关手记 ↗</Link>}
        {detail && <div className="record-provenance"><p>录入日期：{record.recordedAt} · 发生时间与录入时间分别记录</p>{record.sources.map((source, index) => <p key={index}>来源：{source.articleId ? <Link href={`/docs/${source.articleId}`}>{source.label} ↗</Link> : source.label}</p>)}</div>}
      </article></div></div>;
    })}</div>{!filteredRecords.length && <p className="record-feed-empty">这类记录还没有内容。</p>}</div>
    {!detail && <ListPagination page={page} pageCount={pageCount} total={filteredRecords.length} onChange={changePage} label="个人记录" />}
  </div>;
}
