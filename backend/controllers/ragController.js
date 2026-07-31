const { v4: uuidv4 }          = require('uuid');
const KnowledgeDocument        = require('../models/KnowledgeDocument');
const Medicine                 = require('../models/Medicine');
const { ingestDocument, retrieveContext, generateRAGResponse, getMedicineRAGInfo } = require('../services/ragService');
const qdrant                   = require('../services/qdrantService');

/* ── Check super admin ── */
const isSuperAdmin = (user) =>
  user?.email === process.env.SUPER_ADMIN_EMAIL || user?.role === 'superadmin';

/* ════════════════════════════════
   SUPER ADMIN — UPLOAD DOCUMENT
════════════════════════════════ */
exports.uploadDocument = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user))
      return res.status(403).json({ success: false, message: 'Super admin access required' });

    if (!req.file)
      return res.status(400).json({ success: false, message: 'No file uploaded' });

    const {
      documentName, category = 'general',
      medicineName = '', source = '',
      tags = '', description = '',
    } = req.body;

    if (!documentName?.trim())
      return res.status(400).json({ success: false, message: 'Document name required' });

    const documentId = uuidv4();

    // Create DB record first (status: processing)
    const doc = await KnowledgeDocument.create({
      documentId,
      documentName:  documentName.trim(),
      originalName:  req.file.originalname,
      fileSize:      req.file.size,
      mimeType:      req.file.mimetype,
      category,
      medicineName:  medicineName?.trim()?.toLowerCase() || '',
      tags:          tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      source:        source?.trim() || '',
      description:   description?.trim() || '',
      status:        'processing',
      uploadedBy:    req.user._id,
      uploadedByName:req.user.name,
    });

    // Ensure Qdrant collection exists
    await qdrant.ensureCollection();

    // Ingest in background (don't await — respond immediately)
    ingestDocument({
      buffer:       req.file.buffer,
      mimeType:     req.file.mimetype,
      originalName: req.file.originalname,
      documentId,
      documentName: documentName.trim(),
      category,
      medicineName: medicineName?.trim()?.toLowerCase() || '',
      source:       source?.trim() || '',
      tags:         doc.tags,
    })
    .then(async (stats) => {
      await KnowledgeDocument.findByIdAndUpdate(doc._id, {
        status:      'ready',
        chunkCount:  stats.chunks,
        vectorCount: stats.vectors,
        textLength:  stats.textLength,
      });
      console.log(`[RAG] ✓ Document "${documentName}" ready — ${stats.vectors} vectors`);
    })
    .catch(async (err) => {
      await KnowledgeDocument.findByIdAndUpdate(doc._id, {
        status: 'failed', errorMessage: err.message,
      });
      console.error('[RAG] Ingestion failed:', err.message);
    });

    res.status(201).json({
      success: true,
      document: doc,
      message: `"${documentName}" is being processed. Vectors will be ready in ~${Math.ceil(req.file.size / 50000) * 5} seconds.`,
    });
  } catch (err) {
    console.error('[RAG] Upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Upload raw text ── */
exports.uploadText = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user))
      return res.status(403).json({ success: false, message: 'Super admin access required' });

    const { documentName, text, category, medicineName, source, tags, description } = req.body;

    if (!documentName?.trim() || !text?.trim())
      return res.status(400).json({ success: false, message: 'documentName and text required' });

    const documentId = uuidv4();
    const buffer     = Buffer.from(text, 'utf-8');

    const doc = await KnowledgeDocument.create({
      documentId,
      documentName:  documentName.trim(),
      originalName:  'text-input.txt',
      fileSize:      buffer.length,
      mimeType:      'text/plain',
      category:      category || 'general',
      medicineName:  medicineName?.trim()?.toLowerCase() || '',
      tags:          tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      source:        source?.trim() || '',
      description:   description?.trim() || '',
      status:        'processing',
      uploadedBy:    req.user._id,
      uploadedByName:req.user.name,
    });

    await qdrant.ensureCollection();

    ingestDocument({
      buffer,
      mimeType:     'text/plain',
      originalName: 'text-input.txt',
      documentId,
      documentName: documentName.trim(),
      category:     category || 'general',
      medicineName: medicineName?.trim()?.toLowerCase() || '',
      source:       source?.trim() || '',
      tags:         doc.tags,
    })
    .then(async (stats) => {
      await KnowledgeDocument.findByIdAndUpdate(doc._id, {
        status: 'ready', chunkCount: stats.chunks,
        vectorCount: stats.vectors, textLength: stats.textLength,
      });
    })
    .catch(async (err) => {
      await KnowledgeDocument.findByIdAndUpdate(doc._id, { status: 'failed', errorMessage: err.message });
    });

    res.status(201).json({ success: true, document: doc, message: `"${documentName}" is being processed.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── GET all documents ── */
exports.getDocuments = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user))
      return res.status(403).json({ success: false, message: 'Super admin access required' });

    const { category, status, search } = req.query;
    const query = {};
    if (category) query.category = category;
    if (status)   query.status   = status;
    if (search)   query.$or = [
      { documentName: { $regex: search, $options: 'i' } },
      { medicineName: { $regex: search, $options: 'i' } },
      { tags:         { $regex: search, $options: 'i' } },
    ];

    const docs  = await KnowledgeDocument.find(query).sort({ createdAt: -1 }).lean();
    const total = await qdrant.countPoints().catch(() => 0);

    const stats = await KnowledgeDocument.aggregate([
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        vectors: { $sum: '$vectorCount' },
      }},
    ]);

    res.json({ success: true, documents: docs, totalVectors: total, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── DELETE document + its vectors ── */
exports.deleteDocument = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user))
      return res.status(403).json({ success: false, message: 'Super admin access required' });

    const doc = await KnowledgeDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    // Delete vectors from Qdrant
    await qdrant.deleteByDocumentId(doc.documentId);

    // Delete DB record
    await doc.deleteOne();

    res.json({ success: true, message: `"${doc.documentName}" deleted — ${doc.vectorCount} vectors removed` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Collection info ── */
exports.getCollectionInfo = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user))
      return res.status(403).json({ success: false, message: 'Super admin access required' });

    const info = await qdrant.getCollectionInfo();
    res.json({ success: true, collection: info });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ════════════════════════════════
   ALL AUTHENTICATED USERS
════════════════════════════════ */

/* ── GET medicine RAG info (main integration) ── */
exports.getMedicineInfo = async (req, res) => {
  try {
    const { name } = req.params;
    const { query } = req.query;  // optional additional query

    if (!name?.trim())
      return res.status(400).json({ success: false, message: 'Medicine name required' });

    const ragResult = await getMedicineRAGInfo(name.trim(), query || '');

    if (!ragResult)
      return res.json({ success: true, found: false, message: 'No knowledge base entries found for this medicine' });

    res.json({ success: true, found: true, ...ragResult });
  } catch (err) {
    console.error('[RAG] getMedicineInfo error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── General semantic search ── */
exports.search = async (req, res) => {
  try {
    const { query, category, medicineName, limit = 5 } = req.body;

    if (!query?.trim())
      return res.status(400).json({ success: false, message: 'Query required' });

    const context = await retrieveContext(query.trim(), {
      limit:         Number(limit),
      category:      category || null,
      medicineName:  medicineName || null,
      scoreThreshold: 0.60,
    });

    if (!context.length)
      return res.json({ success: true, found: false, results: [], message: 'No relevant content found' });

    const ragResult = await generateRAGResponse(query.trim(), context);

    res.json({ success: true, found: true, ...ragResult, rawChunks: context });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Quick context retrieval (no LLM — just relevant chunks) ── */
exports.retrieveChunks = async (req, res) => {
  try {
    const { query, category, medicineName, limit = 5 } = req.body;
    if (!query?.trim()) return res.status(400).json({ success: false, message: 'Query required' });

    const chunks = await retrieveContext(query.trim(), {
      limit: Number(limit),
      category: category || null,
      medicineName: medicineName?.toLowerCase() || null,
      scoreThreshold: 0.55,
    });

    res.json({ success: true, chunks, total: chunks.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};