const { QdrantClient } = require('@qdrant/js-client-rest');

const COLLECTION = process.env.QDRANT_COLLECTION || 'elitehms_knowledge';
const VECTOR_SIZE = 768; // text-embedding-004 output dim

let _client = null;

function getClient() {
  if (!_client) {
    _client = new QdrantClient({
      url:    process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
  }
  return _client;
}

/* ── Ensure collection exists (idempotent) ── */
async function ensureCollection() {
  const client = getClient();
  try {
    await client.getCollection(COLLECTION);
    console.log(`[Qdrant] Collection "${COLLECTION}" already exists`);
  } catch {
    // Collection doesn't exist — create it
    await client.createCollection(COLLECTION, {
      vectors: {
        size:     VECTOR_SIZE,
        distance: 'Cosine',
      },
      optimizers_config: {
        default_segment_number: 2,
      },
      replication_factor: 1,
    });

    // Create payload indexes for filtering
    await client.createPayloadIndex(COLLECTION, {
      field_name: 'documentId',
      field_schema: 'keyword',
    });
    await client.createPayloadIndex(COLLECTION, {
      field_name: 'category',
      field_schema: 'keyword',
    });
    await client.createPayloadIndex(COLLECTION, {
      field_name: 'medicineName',
      field_schema: 'keyword',
    });

    console.log(`[Qdrant] Collection "${COLLECTION}" created`);
  }
}

/* ── Upsert points (vectors + payload) ── */
async function upsertPoints(points) {
  const client = getClient();
  await client.upsert(COLLECTION, {
    wait:   true,
    points, // [{ id, vector, payload }]
  });
}

/* ── Semantic search ── */
async function search(queryVector, { limit = 5, scoreThreshold = 0.65, filter = null } = {}) {
  const client = getClient();
  const params = {
    vector:       queryVector,
    limit,
    with_payload: true,
    with_vectors: false,
    score_threshold: scoreThreshold,
  };
  if (filter) params.filter = filter;

  const results = await client.search(COLLECTION, params);
  return results; // [{ id, score, payload }]
}

/* ── Delete all vectors for a document ── */
async function deleteByDocumentId(documentId) {
  const client = getClient();
  await client.delete(COLLECTION, {
    wait: true,
    filter: {
      must: [{ key: 'documentId', match: { value: documentId } }],
    },
  });
}

/* ── Count total points in collection ── */
async function countPoints() {
  const client = getClient();
  const info = await client.getCollection(COLLECTION);
  return info.points_count || 0;
}

/* ── Collection info ── */
async function getCollectionInfo() {
  const client = getClient();
  return client.getCollection(COLLECTION);
}

module.exports = {
  ensureCollection,
  upsertPoints,
  search,
  deleteByDocumentId,
  countPoints,
  getCollectionInfo,
};