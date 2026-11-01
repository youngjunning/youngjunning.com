import { preparePublicContent } from '../lib/content-store.mjs';
const { catalog, knowledge } = preparePublicContent();
console.log(JSON.stringify({ result: 'prepared', articles: catalog.documents.length, sources: knowledge.entries.length, engineering: knowledge.engineeringPages.length }));
