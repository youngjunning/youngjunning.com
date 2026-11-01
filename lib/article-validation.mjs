import { createHash } from 'node:crypto';
import { assertPublicText } from './model.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');

// This archive was explicitly approved for verbatim migration from the public blog.
// Only reviewed, byte-identical imports get the exception for historical example
// paths and localhost URLs. Other content still uses the normal public policy.
export function assertArticleText(raw, data, body, entries = []) {
  const entry = entries.find(item => item.status !== 'excluded' && item.id === data.id);
  if (!entry) return assertPublicText(raw);
  if (entry.source !== data.source || entry.title !== data.title || entry.importedSha256 !== digest(raw) || entry.bodySha256 !== digest(body)) {
    throw new Error('Imported article differs from its reviewed migration: ' + data.title);
  }
  const checked = raw
    .replace(/Bearer Authentication\b/g, '')
    .replace(/Bearer invalid-token\b/g, '')
    .replace(/Bearer [A-Za-z0-9_.-]+\.\.\./g, '');
  if (/(?:\b(?:sk|ghp|gho)[_-][A-Za-z0-9_-]{16,}|\bnpm_[A-Za-z0-9]{30,}|(?:NPM_(?:AUTH_)?TOKEN|_authToken)\s*[:=]\s*["']?[A-Za-z0-9_-]{30,}|\bBearer\s+[A-Za-z0-9_.-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(checked)) {
    throw new Error('Imported article contains a credential-like value: ' + data.title);
  }
}
