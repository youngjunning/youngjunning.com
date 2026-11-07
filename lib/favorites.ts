import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { FavoriteStore } from './favorite-types';
export function getFavoriteStore(): FavoriteStore {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), '.content/favorites.json'), 'utf8'));
}
