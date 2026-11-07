import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { ResearchItem, ExcerptItem } from './curation-types';

function read<T>(file: string): T[] {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), '.content', file), 'utf8')).items;
}
export const getResearch = () => read<ResearchItem>('research.json');
export const getExcerpts = () => read<ExcerptItem>('excerpts.json');
