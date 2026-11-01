export type ConversationMessage = { role: 'user' | 'assistant'; content: string };
export type ConversationSource = {
  id: string;
  kind: 'record' | 'blog' | 'code';
  title: string;
  url: string;
  rawUrl: string;
  date: string | null;
  excerpt: string;
  sha256: string;
  lineStart?: number;
  lineEnd?: number;
  recordKind?: string;
  commit?: string;
  engineeringKind?: string;
};
export type KnowledgeEntry = ConversationSource & { text: string; searchTitle: string; relatedIds: string[]; tags?: string[]; recordedAt?: string; reviewedEngineering?: boolean; personalJudgment?: boolean; codeMeta?: {repository:string;language:string;completeSymbol?:boolean;symbolName:string|null;symbolType:string;qualified:string|null;edges:{target:string;type:string}[]} };
export type WikiParagraph = { id: string; kind: 'synthesis' | 'comparison' | 'documented-change' | 'open-question'; text: string; attribution: 'model-synthesis'; evidence: { sourceId: string; sha256: string; quote: string }[] };
export type WikiPage = { id: string; key: string; title: string; type: string; coverage: { totalSources: number; sampledSources: number; totalEntries: number; sampledEntries: number; complete: boolean }; paragraphs: WikiParagraph[] };
export type ConversationKnowledge = { version: 1; generatedAt: string; revision: string; entries: KnowledgeEntry[]; relationships?: { from: string; to: string; type: string }[]; engineeringPages?: WikiPage[]; wiki?: { version: number; pages: WikiPage[] } };
export type ConversationReply = {
  paragraphs: { text: string; sourceIds: string[]; claimType?: 'engineering' }[];
  sources: ConversationSource[];
  insufficient: boolean;
  snapshot: { generatedAt: string; revision: string };
};
