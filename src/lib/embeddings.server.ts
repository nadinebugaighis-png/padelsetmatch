// Server-only helper for calling Lovable AI embeddings + cosine similarity.
const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const EMBED_MODEL = "openai/text-embedding-3-small"; // 1536 dims, cheap + fast for high-volume Q&A

export async function embedText(text: string): Promise<number[] | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key || !text?.trim()) return null;
  try {
    const res = await fetch(EMBED_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 2000) }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    return json.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

export function cosineSim(a: number[] | null | undefined, b: number[] | null | undefined): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Postgres pgvector text format: "[0.1,0.2,...]"
export function parsePgVector(v: unknown): number[] | null {
  if (Array.isArray(v)) return v as number[];
  if (typeof v !== "string" || !v.startsWith("[")) return null;
  try {
    return JSON.parse(v) as number[];
  } catch {
    return null;
  }
}

export function toPgVector(v: number[]): string {
  return `[${v.join(",")}]`;
}
