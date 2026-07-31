const fetch = require('node-fetch');

const GEMINI_EMBED_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent';

/**
 * Generate a 768-dim embedding vector using Gemini text-embedding-004
 * @param {string} text
 * @param {'RETRIEVAL_DOCUMENT'|'RETRIEVAL_QUERY'|'SEMANTIC_SIMILARITY'} taskType
 */
async function embedText(text, taskType = 'RETRIEVAL_DOCUMENT') {
  const res = await fetch(
    `${GEMINI_EMBED_URL}?key=${process.env.GEMINI_API_KEY}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:    'models/gemini-embedding-2',
        content:  { parts: [{ text: text.slice(0, 2048) }] }, // API limit
        taskType,
        outputDimensionality: 768,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini Embed API error: ${res.status} — ${err}`);
  }

  const data = await res.json();
  return data.embedding.values; // float32 array, length 768
}

/**
 * Embed a batch of texts (sequential to respect rate limits)
 * @param {string[]} texts
 * @param {string} taskType
 * @returns {number[][]}
 */
async function embedBatch(texts, taskType = 'RETRIEVAL_DOCUMENT') {
  const embeddings = [];
  for (const text of texts) {
    const emb = await embedText(text, taskType);
    embeddings.push(emb);
    // Small delay to avoid rate limiting (Gemini free: 1500 req/min)
    await new Promise(r => setTimeout(r, 50));
  }
  return embeddings;
}

module.exports = { embedText, embedBatch };