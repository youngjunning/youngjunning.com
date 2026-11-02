export type Source = { label: string; url?: string | null };
export type ResearchItem = {
  id: string; title: string; question: string; context: string; reason: string;
  nextStep: string; nextStepSource: 'user' | 'suggested';
  status: 'todo' | 'in_progress' | 'paused' | 'completed' | 'dropped';
  blocker: string | null; result: string | null; relatedFavoriteIds: string[];
  createdAt: string; updatedAt: string; visibility: 'shared' | 'private'; sources: Source[];
};
export type ExcerptItem = {
  id: string; title: string; context: string; reason: string;
  selection: 'explicit' | 'discovered'; format: 'verbatim' | 'summary';
  messages: { role: 'user' | 'assistant'; text: string }[];
  source: Source; date: string | null; savedAt: string; visibility: 'shared' | 'private';
};
