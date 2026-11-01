export type SkillUsageProject = { id: string; name: string; kind: string; triggerCount: number };
export type SkillUsageItem = { name: string; triggerCount: number; projects: { projectId: string; triggerCount: number }[] };
export type SkillUsageStore = {
  version: number; updatedAt: string; metric: string;
  totals: { triggerCount: number; skillCount: number; projectCount: number; directoryGroupCount: number; unattributedTriggers: number; ambiguousTriggers: number; pendingBackfillObservations: number };
  coverage: { fileCount: number; firstSeen: string | null; lastSeen: string | null };
  skills: SkillUsageItem[]; projects: SkillUsageProject[];
};
