export type Publication = { status: 'draft' | 'ready' | 'published' | 'unknown'; url: string | null; publishedAt: string | null; recordSource?: string; recordLine?: number; recordNote?: string };
export type Topic = { id: string; label: string; description: string; color: string };
export type Document = { id: string; title: string; date: string | null; tags: string[]; sourcePath: string; kind: 'markdown' | 'html'; collection: 'ata' | 'docs'; publication: Publication | null; topic: string; classification: string; summary: string; headings: string[]; words: number; sha256: string; url: string; rawUrl: string };
export type Catalog = { schemaVersion: number; generatedAt: string; source: { revision: string; dirty: boolean; root: string }; topics: Topic[]; documents: Document[] };
export type GraphNode = { id: string; label: string; type: 'topic' | 'document' | 'favorite' | 'project' | 'tag'; topic: string; url?: string; publication?: Publication | null };
export type GraphEdge = { source: string; target: string; type: 'belongs_to' | 'references' | 'tagged' | 'uses'; evidence: { sourcePath: string; line?: number; target?: string; basis?: string } };
export type Graph = Omit<Catalog, 'documents'> & { nodes: GraphNode[]; edges: GraphEdge[] };
