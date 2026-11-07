import 'server-only';
import data from '@/content/okr.json';
import { validateOkr } from './okr-model.mjs';
import type { OkrStore } from './okr-types';

export function getOkrStore(): OkrStore { return validateOkr(data); }
