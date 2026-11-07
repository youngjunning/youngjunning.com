/** Compare source URLs with the URI-encoded URLs emitted by Markdown. */
function urlKey(value) {
  try { return decodeURI(value); } catch { return value; }
}

/** @param {Record<string, string>} urls */
export function markdownUrlTransform(urls) {
  const targets = new Map(Object.entries(urls).map(([from, to]) => [urlKey(from), to]));
  /** @param {string} url */
  return (url) => targets.get(urlKey(url)) ?? url;
}
