export type KeyResult = { id: string; title: string; description: string; openQuestions?: string[] };
export type Objective = { id: string; title: string; description: string; weight: number; keyResults: KeyResult[] };
export type OkrMaterial = {
  id: string; month: string; recordedAt: string; keyResultId: string;
  title: string; summary: string; source: string; evidenceNote: string;
  images: { url: string; alt: string; sha256: string; width: number; height: number }[];
};
export type OkrStore = {
  version: number; period: string; owner: string; recordedAt: string; principle: string; source: string;
  objectives: Objective[]; materials: OkrMaterial[];
};
