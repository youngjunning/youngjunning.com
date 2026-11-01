// Count the normalized article text supplied by the content pipeline, including
// code but excluding whitespace. Array.from counts Unicode code points.
export function countArticleCharacters(text) {
  return Array.from(text.replace(/\s/gu, '')).length;
}

// A reading estimate, shared by every article entry point.
export function readingMinutes(words) {
  return Math.max(1, Math.ceil(words / 500));
}
