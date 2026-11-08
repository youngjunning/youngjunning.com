'use client';

import { useEffect, useState } from 'react';
import type { AgentConfig } from './agent-config-types';

export const configViews = [
  { id: 'source', label: '配置原文' },
  { id: 'evaluation', label: '模型评测' },
  { id: 'history', label: '版本记录' },
] as const;
export type ConfigView = typeof configViews[number]['id'];

export function useAgentConfigLibrary(configs: AgentConfig[]) {
  const [selectedId, setSelectedId] = useState(configs[0]?.id ?? '');
  const [view, setView] = useState<ConfigView>('source');
  useEffect(() => {
    const navigate = () => {
      const id = window.location.hash.slice(1);
      if (configs.some(entry => entry.id === id)) {
        setSelectedId(id);
        setView('source');
      }
    };
    navigate();
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, [configs]);
  return { selected: configs.find(entry => entry.id === selectedId) ?? configs[0], view, setView };
}
