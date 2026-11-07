import 'server-only';
import source from '@/content/agent-configs.json';
import { validateAgentConfigs } from './agent-configs.mjs';
import { siteProfile } from './site-profile.mjs';
import type { AgentConfigStore } from './agent-config-types';

export const agentConfigStore = validateAgentConfigs(source, siteProfile.indexable ? 'public' : 'internal') as AgentConfigStore;
