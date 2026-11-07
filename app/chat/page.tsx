import Shell from '@/components/shell';
import { getSiteTheme } from '@/lib/site-theme';
import StatechartShell from '@/components/statechart/shell';
import PaperChat from '@/components/statechart/chat';
import TwinConversation from '@/components/lucian/twin-conversation';
import { isConversationAvailable, getConversationModelName } from '@/lib/twin-server';

export const dynamic = 'force-dynamic';
export const metadata = { title: '对话' };
export default async function ChatPage() {
  if (await getSiteTheme() === 'statechart') return <StatechartShell active="/chat" title="纸上对话" subtitle="提问、查阅、回答与出处，放在同一张桌上。"><PaperChat available={isConversationAvailable()} modelName={getConversationModelName()} /></StatechartShell>;
  return <Shell active="chat"><TwinConversation available={isConversationAvailable()} modelName={getConversationModelName()} /></Shell>;
}
