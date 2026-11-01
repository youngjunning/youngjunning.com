import { prepareRecords } from './record-model.mjs';
import { prepareFavorites, canonicalFavoriteUrl } from './favorite-model.mjs';
function check(ok, message) { if (!ok) throw new Error(message); }
export function assertPublicText(text) {
  check(!/(?:alibaba-inc\.com|atatech\.org|cdn\.fliggy\.com|\/(?:Users|home)\/[^\s"'<>]+|[A-Z]:\\Users\\|(?:sk|ghp|gho)[_-][A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9_.-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(text), 'Public content contains an internal locator, local path, or credential');
  const outsideUrls = text.replace(/https?:\/\/[^\s"'<>]+/g, '');
  check(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(outsideUrls), 'Public content contains a raw session identifier');
  for (const match of text.matchAll(/https?:\/\/[^\s"'<>]+/g)) {
    const url = new URL(match[0]);
    check(!url.username && !url.password, 'Credential-bearing URL');
    check(!/^(?:localhost|127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname), 'Private network URL');
    check(![...url.searchParams.keys()].some(key => /^(?:token|access_token|api_key|secret|password)$/i.test(key)), 'Sensitive URL parameter');
  }
}

// Shared schema first; repository audience rules are an additional boundary.
export function validateRecords(store, articleIds = new Set()) {
  const result = prepareRecords(store, articleIds);
  for (const item of store.records) {
    check(item.visibility === 'shared', 'Public repository cannot store private records');
    assertPublicText(JSON.stringify(item));
  }
  return result.records;
}
export const canonicalUrl = canonicalFavoriteUrl;
export function validateFavorites(store) {
  const result = prepareFavorites(store);
  for (const item of store.favorites) {
    check(item.visibility === 'shared', 'Public repository cannot store private favorites');
    assertPublicText(JSON.stringify(item));
  }
  return result.favorites;
}
