import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';

// Sanitize source HTML before the trusted highlighter adds its token spans.
// Untagged blocks (diagrams, logs, prose) must never be guessed as code.
/** @type {import('unified').PluggableList} */
export const markdownRehypePlugins = [
  rehypeRaw,
  [rehypeSanitize, {
    ...defaultSchema,
    tagNames: [...defaultSchema.tagNames, 'iframe'],
    attributes: { ...defaultSchema.attributes, iframe: ['src', 'title'] },
  }],
  rehypeSlug,
  [rehypeHighlight, { detect: false, plainText: ['text', 'txt', 'plain', 'plaintext', 'mermaid', 'gn'] }],
];
