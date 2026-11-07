import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { ExperienceRecord, RecordStore } from './record-types';
import persona from './persona';

export function getRecordStore(): RecordStore {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), '.content/records.json'), 'utf8'));
}
export function getRecords() { return getRecordStore().records; }
export function getJourneyRecords(records = getRecords()) {
  const selected = new Set(persona.featuredExperienceIds);
  return records.filter((record): record is ExperienceRecord => record.kind === 'experience' && selected.has(record.id))
    .sort((a, b) => (b.start || '').localeCompare(a.start || ''));
}
export function getRecord(id: string) {
  if (!/^[a-f0-9]{16}$/.test(id)) return null;
  return getRecords().find((record) => record.id === id) ?? null;
}
