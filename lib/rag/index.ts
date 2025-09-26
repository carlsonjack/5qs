import {
  embeddings as nimEmbeddings,
  rerank as nimRerank,
} from "../nim/client";

type Doc = { id: string; text: string; meta: any };

const MEMORY: {
  docs: Doc[];
  vectors: Map<string, number[]>; // id -> embedding
  domainCache: Map<string, { timestamp: number; docIds: string[] }>;
  embeddingCache: Map<string, { timestamp: number; embedding: number[] }>; // url#hash -> embedding
} = {
  docs: [],
  vectors: new Map(),
  domainCache: new Map(),
  embeddingCache: new Map(),
};

const EMBEDDINGS_MODEL =
  process.env.EMBEDDINGS_MODEL || "nvidia/nv-embedqa-e5-v5";
const RERANK_MODEL =
  process.env.RERANK_MODEL || "nvidia/nv-rerankqa-mistral-4b-v3";
const RAG_ENABLED =
  (process.env.RAG_ENABLED || "true").toLowerCase() === "true";
const OCR_ENABLED =
  (process.env.OCR_ENABLED || "false").toLowerCase() === "true";

// Simple hash function for content
function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export async function embedDocuments(docs: Doc[]): Promise<void> {
  if (!RAG_ENABLED || docs.length === 0) return;
  const texts = docs.map((d) => d.text);
  const { embeddings } = await nimEmbeddings({
    input: texts,
    model: EMBEDDINGS_MODEL,
  });
  docs.forEach((doc, i) => {
    MEMORY.docs.push(doc);
    MEMORY.vectors.set(doc.id, embeddings[i]);
  });
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

export async function queryRag({
  query,
  k = 12,
}: {
  query: string;
  k?: number;
}) {
  if (!RAG_ENABLED || MEMORY.docs.length === 0)
    return [] as Array<{ id: string; text: string; score: number; meta: any }>;
  const { embeddings } = await nimEmbeddings({
    input: query,
    model: EMBEDDINGS_MODEL,
  });
  const q = embeddings[0];

  const scored = MEMORY.docs.map((d) => {
    const v = MEMORY.vectors.get(d.id);
    const score = v ? cosineSimilarity(q, v) : 0;
    return { id: d.id, text: d.text, score, meta: d.meta };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

export async function rerankRag({
  query,
  hits,
  k = 6,
}: {
  query: string;
  hits: Array<{ id: string; text: string }>;
  k?: number;
}) {
  if (!RAG_ENABLED || hits.length === 0)
    return [] as Array<{ id: string; text: string; score: number }>;
  const { ranked } = await nimRerank({
    query,
    documents: hits.map((h) => ({ id: h.id, text: h.text })),
    model: RERANK_MODEL,
    top_n: k,
  });
  return ranked.slice(0, k);
}

export function chunkText(
  text: string,
  chunkSize = 1200,
  overlap = 150
): Array<{ text: string; index: number }> {
  const chunks: Array<{ text: string; index: number }> = [];
  let i = 0;
  let idx = 0;
  while (i < text.length) {
    const end = Math.min(text.length, i + chunkSize);
    const slice = text.slice(i, end);
    chunks.push({ text: slice, index: idx });
    idx += 1;
    i += chunkSize - overlap;
  }
  return chunks;
}

export async function maybeOCR(file: File): Promise<string | null> {
  if (!OCR_ENABLED) return null;
  // TODO: integrate actual OCR library (e.g., Tesseract on server or a service)
  // For now, return null to passthrough existing extraction flows.
  console.log("OCR stub invoked for", file.name);
  return null;
}

export function cacheDomain(domain: string, docIds: string[]) {
  MEMORY.domainCache.set(domain, { timestamp: Date.now(), docIds });
}

export function getCachedDomain(domain: string): { docIds: string[] } | null {
  const entry = MEMORY.domainCache.get(domain);
  if (!entry) return null;
  const ttlMs = 24 * 60 * 60 * 1000;
  if (Date.now() - entry.timestamp > ttlMs) return null;
  return { docIds: entry.docIds };
}

export function cacheEmbedding(
  url: string,
  content: string,
  embedding: number[]
) {
  const hash = simpleHash(content);
  const key = `${url}#${hash}`;
  MEMORY.embeddingCache.set(key, { timestamp: Date.now(), embedding });
}

export function getCachedEmbedding(
  url: string,
  content: string
): number[] | null {
  const hash = simpleHash(content);
  const key = `${url}#${hash}`;
  const entry = MEMORY.embeddingCache.get(key);
  if (!entry) return null;
  const ttlMs = 24 * 60 * 60 * 1000;
  if (Date.now() - entry.timestamp > ttlMs) return null;
  return entry.embedding;
}

export function getDocsByIds(ids: string[]): Doc[] {
  const set = new Set(ids);
  return MEMORY.docs.filter((d) => set.has(d.id));
}
