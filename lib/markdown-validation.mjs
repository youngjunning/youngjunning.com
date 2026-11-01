import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

const parser = unified().use(remarkParse).use(remarkGfm);
const punctuation = /[\p{P}\p{S}]/u;
const word = /[\p{L}\p{N}]/u;

// Inspect only markers left as literal text by the same parser as the reader.
// Code, HTML, link destinations, escapes and successfully parsed strong spans
// must not be mistaken for malformed emphasis.
export function markdownEmphasisIssues(body) {
  const issues = [];
  function checkBlock(block) {
    const markers = [];
    function collect(node) {
      if (node.type === 'text' && node.position) {
        const start = node.position.start.offset;
        const source = body.slice(start, node.position.end.offset);
        for (const match of source.matchAll(/\*+|_+/g)) {
          if (match[0] !== '**' && match[0] !== '__') continue;
          const offset = start + match.index;
          let slashes = 0;
          for (let i = offset - 1; i >= 0 && body[i] === '\\'; i--) slashes++;
          if (slashes % 2) continue;
          markers.push({ offset, value: match[0] });
        }
      }
      node.children?.forEach(collect);
    }
    collect(block);
    for (let i = 0; i + 1 < markers.length; i++) {
      const opening = markers[i], closing = markers[i + 1];
      if (opening.value !== closing.value) continue;
      const first = [...body.slice(opening.offset + 2)][0] || '';
      const last = [...body.slice(0, closing.offset)].at(-1) || '';
      if (!first || !last || /\s/u.test(first) || /\s/u.test(last)) continue;
      const before = [...body.slice(0, opening.offset)].at(-1) || '';
      const after = [...body.slice(closing.offset + 2)][0] || '';
      const badOpening = word.test(before) && punctuation.test(first);
      const badClosing = punctuation.test(last) && word.test(after);
      if (!badOpening && !badClosing) continue;
      const offset = badClosing ? closing.offset : opening.offset;
      const prefix = body.slice(0, offset);
      issues.push({ line: prefix.split('\n').length, column: offset - prefix.lastIndexOf('\n') });
      i++;
    }
  }
  function visit(node) {
    if (['paragraph', 'heading', 'tableCell'].includes(node.type)) checkBlock(node);
    else node.children?.forEach(visit);
  }
  visit(parser.parse(body));
  return issues;
}
