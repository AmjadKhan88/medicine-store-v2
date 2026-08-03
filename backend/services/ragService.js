const pdfParse  = require('pdf-parse');
const mammoth   = require('mammoth');
const { v4: uuidv4 } = require('uuid');
const { embedText, embedBatch } = require('./embeddingService');
const qdrant    = require('./qdrantService');
const Groq      = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* ════════════════════════════════
   TEXT EXTRACTION
════════════════════════════════ */

async function extractText(buffer, mimeType, originalName) {
  const ext = originalName?.split('.').pop()?.toLowerCase();

  if (mimeType === 'application/pdf' || ext === 'pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || ext === 'docx'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (
    mimeType === 'text/plain' || ext === 'txt' ||
    mimeType === 'text/markdown' || ext === 'md'
  ) {
    return buffer.toString('utf-8');
  }

  if (mimeType === 'application/json' || ext === 'json') {
    const parsed = JSON.parse(buffer.toString('utf-8'));
    // Convert JSON to readable text
    return jsonToText(parsed);
  }

  throw new Error(`Unsupported file type: ${mimeType || ext}`);
}

function jsonToText(obj, depth = 0) {
  if (typeof obj === 'string') return obj;
  if (typeof obj !== 'object' || obj === null) return String(obj);

  return Object.entries(obj)
    .map(([k, v]) => {
      const label = k.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
      const value = Array.isArray(v)
        ? v.map(i => typeof i === 'object' ? jsonToText(i, depth + 1) : i).join('; ')
        : typeof v === 'object'
          ? '\n' + jsonToText(v, depth + 1)
          : v;
      return `${label}: ${value}`;
    })
    .join('\n');
}

/* ════════════════════════════════
   CHUNKING
════════════════════════════════ */

/**
 * Split text into overlapping chunks
 * Strategy: split by paragraphs, then by sentences if chunk too large
 */
function chunkText(text, chunkSize = 600, overlap = 80) {
  // Normalize whitespace
  const clean = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();

  if (clean.length <= chunkSize) return [clean];

  const chunks = [];
  // First split by double newline (paragraphs)
  const paragraphs = clean.split(/\n\n+/);

  let current = '';

  for (const para of paragraphs) {
    // If adding this paragraph keeps us under limit
    if ((current + '\n\n' + para).length <= chunkSize) {
      current = current ? current + '\n\n' + para : para;
    } else {
      // Save current chunk if not empty
      if (current) {
        chunks.push(current.trim());
        // Start next chunk with overlap
        const overlapText = current.slice(-overlap);
        current = overlapText + '\n\n' + para;
      } else {
        // Single paragraph too large — split by sentences
        const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
        let sentChunk = '';
        for (const sent of sentences) {
          if ((sentChunk + ' ' + sent).length <= chunkSize) {
            sentChunk = sentChunk ? sentChunk + ' ' + sent : sent;
          } else {
            if (sentChunk) chunks.push(sentChunk.trim());
            sentChunk = sent;
          }
        }
        if (sentChunk) current = sentChunk;
      }
    }
  }

  if (current) chunks.push(current.trim());

  // Filter empty/tiny chunks
  return chunks.filter(c => c.length > 20);
}

/* ════════════════════════════════
   INGEST DOCUMENT
════════════════════════════════ */

async function ingestDocument({
  buffer, mimeType, originalName,
  documentId, documentName,
  category = 'general',
  medicineName = '',
  source = '',
  tags = [],
  storeId = 'superadmin',
  scope = 'global',
}) {
  // 1. Extract text
  const rawText = await extractText(buffer, mimeType, originalName);
  if (!rawText?.trim()) throw new Error('No text could be extracted from this file');

  // 2. Chunk text
  const chunks = chunkText(rawText, 600, 80);
  if (!chunks.length) throw new Error('Document produced no valid chunks');

  // 3. Generate embeddings (batch)
  console.log(`[RAG] Ingesting "${documentName}" — ${chunks.length} chunks`);
  const embeddings = await embedBatch(chunks, 'RETRIEVAL_DOCUMENT');

  // 4. Build Qdrant points
  const points = chunks.map((text, i) => ({
    id:      uuidv4(),
    vector:  embeddings[i],
    payload: {
      text,
      documentId,
      documentName,
      category,
      medicineName:  medicineName?.toLowerCase() || '',
      source,
      tags,
      storeId,
      scope,
      chunkIndex:    i,
      totalChunks:   chunks.length,
      charCount:     text.length,
      uploadedAt:    new Date().toISOString(),
    },
  }));

  // 5. Upsert to Qdrant (in batches of 50)
  const batchSize = 50;
  for (let i = 0; i < points.length; i += batchSize) {
    await qdrant.upsertPoints(points.slice(i, i + batchSize));
  }

  console.log(`[RAG] ✓ Ingested ${points.length} vectors for "${documentName}"`);
  return { chunks: chunks.length, vectors: points.length, textLength: rawText.length };
}

/* ════════════════════════════════
   RETRIEVE (RAG query)
════════════════════════════════ */

async function retrieveContext(query, {
  limit = 5,
  category = null,
  medicineName = null,
  scoreThreshold = 0.65,
} = {}) {
  // Embed the query
  const queryVector = await embedText(query, 'RETRIEVAL_QUERY');

  // Build Qdrant filter
  const mustClauses = [];
  if (category) {
    mustClauses.push({ key: 'category', match: { value: category } });
  }
  if (medicineName) {
    mustClauses.push({ key: 'medicineName', match: { value: medicineName.toLowerCase() } });
  }

  const filter = mustClauses.length ? { must: mustClauses } : null;

  // Search
  const results = await qdrant.search(queryVector, { limit, scoreThreshold, filter });

  return results.map(r => ({
    text:         r.payload.text,
    score:        r.score,
    documentName: r.payload.documentName,
    category:     r.payload.category,
    medicineName: r.payload.medicineName,
    chunkIndex:   r.payload.chunkIndex,
    source:       r.payload.source,
  }));
}

/* ════════════════════════════════
   RAG-AUGMENTED RESPONSE (Groq)
════════════════════════════════ */

async function generateRAGResponse(query, context, options = {}) {
  const {
    medicineName = '',
    model = 'llama-3.1-8b-instant',  // Groq model — fast + free
    maxTokens = 800,
  } = options;

  const contextText = context.length > 0
    ? context.map((c, i) => `[Source ${i + 1}: ${c.documentName}]\n${c.text}`).join('\n\n---\n\n')
    : null;

  const systemPrompt = `You are a clinical knowledge assistant for EliteHMS, a pharmacy and hospital management system used in Pakistan.
You answer questions about medicines, drug information, clinical protocols and pharmacy services.

RULES:
1. Base answers on the provided context documents when available
2. If context doesn't cover the question, use your clinical knowledge
3. Always mention the source document when quoting context
4. Include: uses/indications, dosage (if known), side effects, contraindications, interactions
5. Add Pakistan-specific notes when relevant (availability, generic names, local brands)
6. End with: "Consult a qualified pharmacist or physician before dispensing."
7. Be concise but clinically accurate
8. Format with clear sections using **bold** headers`;

  const userMessage = contextText
    ? `Query: "${query}"

Relevant knowledge base context:
${contextText}

Please answer the query using the above context. If the context doesn't fully answer the question, supplement with general clinical knowledge.`
    : `Query: "${query}"

No specific context was found in the knowledge base. Please answer using general clinical knowledge.`;

  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ],
    temperature: 0.2,
    max_tokens:  maxTokens,
  });

  return {
    answer:       completion.choices[0]?.message?.content || 'No response generated',
    model:        completion.model,
    usage:        completion.usage,
    contextUsed:  context.length,
    sources:      [...new Set(context.map(c => c.documentName))],
  };
}

/* ════════════════════════════════
   MEDICINE INFO RAG
   (main integration point)
════════════════════════════════ */

async function getMedicineRAGInfo(medicineName, additionalQuery = '') {
  const query = additionalQuery
    ? `${medicineName}: ${additionalQuery}`
    : `${medicineName} uses, dosage, side effects, contraindications, interactions`;

  // Retrieve with medicine-specific filter first
  let context = await retrieveContext(query, {
    limit:         5,
    medicineName,
    scoreThreshold: 0.60,
  });

  // If fewer than 2 results, broaden search without medicine filter
  if (context.length < 2) {
    const broader = await retrieveContext(query, {
      limit:         5,
      scoreThreshold: 0.60,
    });
    // Merge and deduplicate by text
    const seen = new Set(context.map(c => c.text));
    broader.forEach(c => { if (!seen.has(c.text)) context.push(c); });
    context = context.slice(0, 5);
  }

  if (context.length === 0) return null;  // No relevant context found

  const ragResult = await generateRAGResponse(
    query, context, { medicineName }
  );

  return {
    ...ragResult,
    medicineName,
    query,
    retrievedChunks: context,
  };
}

/* ════════════════════════════════
   3-TIER RETRIEVAL
   1. Store's own docs
   2. Super admin global docs
   3. AI own knowledge (no context)
════════════════════════════════ */

async function retrieveWithFallback(query, storeId, options = {}) {
  const {
    limit         = 5,
    category      = null,
    medicineName  = null,
    scoreThreshold = 0.60,
  } = options;

  const queryVector = await embedText(query, 'RETRIEVAL_QUERY');

  /* ── Tier 1: Store's own knowledge ── */
  let storeResults = await qdrant.searchByStore(queryVector, storeId, {
    limit, scoreThreshold, category,
  });

  const storeChunks = storeResults.map(r => ({
    text:         r.payload.text,
    score:        r.score,
    documentName: r.payload.documentName,
    category:     r.payload.category,
    medicineName: r.payload.medicineName,
    source:       r.payload.source,
    tier:         'store',  // mark which tier it came from
  }));

  /* ── Tier 2: Super admin global docs ── */
  let globalChunks = [];
  const neededMore = limit - storeChunks.length;

  if (neededMore > 0) {
    const globalResults = await qdrant.searchGlobal(queryVector, {
      limit:          neededMore + 2,
      scoreThreshold,
      category,
      medicineName,
    });

    globalChunks = globalResults.map(r => ({
      text:         r.payload.text,
      score:        r.score,
      documentName: r.payload.documentName,
      category:     r.payload.category,
      medicineName: r.payload.medicineName,
      source:       r.payload.source,
      tier:         'global',
    }));
  }

  /* ── Merge, deduplicate by text ── */
  const seen    = new Set(storeChunks.map(c => c.text));
  const merged  = [...storeChunks];
  globalChunks.forEach(c => {
    if (!seen.has(c.text)) { merged.push(c); seen.add(c.text); }
  });

  // Sort by score descending
  merged.sort((a, b) => b.score - a.score);

  return {
    chunks:      merged.slice(0, limit),
    storeTier:   storeChunks.length,
    globalTier:  globalChunks.length,
    hasContext:  merged.length > 0,
  };
}

/* ════════════════════════════════
   STORE-AWARE QUERY (main entry point)
════════════════════════════════ */

async function storeQuery(query, storeId, options = {}) {
  const {
    medicineName = '',
    category     = null,
    limit        = 5,
    model        = 'llama-3.1-8b-instant',
    maxTokens    = 800,
  } = options;

  const { chunks, storeTier, globalTier, hasContext } = await retrieveWithFallback(
    query, storeId,
    { limit, category, medicineName, scoreThreshold: 0.58 }
  );

  /* ── Build context text ── */
  const contextText = hasContext
    ? chunks.map((c, i) => {
        const tierLabel = c.tier === 'store' ? '📋 Store Knowledge' : '🌐 Clinical Database';
        return `[${tierLabel} — ${c.documentName}]\n${c.text}`;
      }).join('\n\n---\n\n')
    : null;

  /* ── System prompt ── */
  const systemPrompt = `You are a clinical AI assistant embedded in EliteHMS, a pharmacy & hospital management system used in Pakistan.
You help doctors and pharmacists with medicine information, clinic-specific protocols and clinical guidelines.

BEHAVIOUR:
1. Use provided context as primary source — cite the document name
2. If context is from "Store Knowledge" — this is clinic-specific info (protocols, patient policies, service pricing)
3. If context is from "Clinical Database" — this is general clinical/drug information
4. If NO context provided — respond from your clinical training knowledge
5. Always include Pakistan-specific notes (generic names, local brands, DRAP status, availability)
6. For medicines: include uses, dosage, side effects, contraindications, interactions
7. Be concise, clinically accurate and professional
8. End medicine responses with: "⚠️ Consult a qualified pharmacist or physician before dispensing."
9. If truly unknown — say "I don't have specific information on this. Please consult clinical references."`;

  const userMessage = contextText
    ? `Question: "${query}"\n\nContext from knowledge base:\n${contextText}\n\nAnswer using the above context. Add any relevant clinical knowledge not covered in the context.`
    : `Question: "${query}"\n\nNo relevant documents found in the knowledge base. Answer from your clinical training knowledge.`;

  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ],
    temperature: 0.2,
    max_tokens:  maxTokens,
  });

  return {
    answer:       completion.choices[0]?.message?.content || 'No response generated',
    model:        completion.model,
    usage:        completion.usage,
    contextUsed:  chunks.length,
    storeTier,
    globalTier,
    noContext:    !hasContext,
    sources:      [...new Set(chunks.map(c => c.documentName))],
    retrievedChunks: chunks,
  };
}

module.exports = {
  ingestDocument,
  retrieveContext,
  generateRAGResponse,
  getMedicineRAGInfo,
  chunkText,
  retrieveWithFallback,
  storeQuery,
};