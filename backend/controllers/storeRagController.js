const { v4: uuidv4 }   = require('uuid');
const KnowledgeDocument = require('../models/KnowledgeDocument');
const { ingestDocument, storeQuery } = require('../services/ragService');
const qdrant            = require('../services/qdrantService');

/* ── Limits ── */
const MAX_DOCS        = 25;           // max documents per store
const MAX_TOTAL_MB    = 15;           // total MB per store
const MAX_TOTAL_BYTES = MAX_TOTAL_MB * 1024 * 1024;
const MAX_FILE_MB     = 5;            // single file max
const MAX_FILE_BYTES  = MAX_FILE_MB * 1024 * 1024;

/* ── Store categories ── */
const STORE_CATEGORIES = [
  'medicine', 'service', 'protocol',
  'guideline', 'store-info', 'pricing', 'general',
];

/* ════════════════════════════════
   UPLOAD DOCUMENT
════════════════════════════════ */
exports.uploadDocument = async (req, res) => {
  try {
    const storeId = req.storeId.toString();

    if (!req.file)
      return res.status(400).json({ success: false, message: 'No file uploaded' });

    /* ── Check file size ── */
    if (req.file.size > MAX_FILE_BYTES)
      return res.status(400).json({
        success: false,
        message: `File too large. Max ${MAX_FILE_MB}MB per file.`,
      });

    /* ── Check document count limit ── */
    const existingCount = await KnowledgeDocument.countDocuments({
      storeId: req.storeId,
      scope:   'store',
      status:  { $ne: 'failed' },
    });
    if (existingCount >= MAX_DOCS)
      return res.status(400).json({
        success: false,
        message: `Document limit reached. Max ${MAX_DOCS} documents per store. Delete old documents to add new ones.`,
      });

    /* ── Check total storage ── */
    const sizeAgg = await KnowledgeDocument.aggregate([
      { $match: { storeId: req.storeId, scope: 'store', status: { $ne: 'failed' } } },
      { $group: { _id: null, totalSize: { $sum: '$fileSize' } } },
    ]);
    const currentBytes = sizeAgg[0]?.totalSize || 0;
    if (currentBytes + req.file.size > MAX_TOTAL_BYTES)
      return res.status(400).json({
        success: false,
        message: `Storage limit reached. You have ${((MAX_TOTAL_BYTES - currentBytes) / 1024 / 1024).toFixed(1)}MB remaining of your ${MAX_TOTAL_MB}MB quota.`,
      });

    const {
      documentName, category = 'general',
      medicineName = '', source = '',
      tags = '', description = '',
    } = req.body;

    if (!documentName?.trim())
      return res.status(400).json({ success: false, message: 'Document name required' });

    if (!STORE_CATEGORIES.includes(category))
      return res.status(400).json({ success: false, message: 'Invalid category' });

    const documentId = uuidv4();

    /* ── Save to DB ── */
    const doc = await KnowledgeDocument.create({
      documentId,
      documentName:  documentName.trim(),
      originalName:  req.file.originalname,
      fileSize:      req.file.size,
      mimeType:      req.file.mimetype,
      storeId:       req.storeId,
      scope:         'store',
      category,
      medicineName:  medicineName?.trim()?.toLowerCase() || '',
      tags:          tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      source:        source?.trim() || '',
      description:   description?.trim() || '',
      status:        'processing',
      uploadedBy:    req.user._id,
      uploadedByName:req.user.name,
    });

    /* ── Ensure collection exists ── */
    await qdrant.ensureCollection();

    /* ── Ingest in background ── */
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
      storeId,           // store-scoped
      scope:        'store',
    })
    .then(async (stats) => {
      await KnowledgeDocument.findByIdAndUpdate(doc._id, {
        status:      'ready',
        chunkCount:  stats.chunks,
        vectorCount: stats.vectors,
        textLength:  stats.textLength,
      });
    })
    .catch(async (err) => {
      await KnowledgeDocument.findByIdAndUpdate(doc._id, {
        status: 'failed', errorMessage: err.message,
      });
      console.error('[StoreRAG] Ingestion failed:', err.message);
    });

    res.status(201).json({
      success: true,
      document: doc,
      remaining: {
        docs:  MAX_DOCS - existingCount - 1,
        bytes: MAX_TOTAL_BYTES - currentBytes - req.file.size,
        mb:    ((MAX_TOTAL_BYTES - currentBytes - req.file.size) / 1024 / 1024).toFixed(1),
      },
      message: `"${documentName}" uploaded and being processed.`,
    });
  } catch (err) {
    console.error('[StoreRAG] Upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Upload plain text ── */
exports.uploadText = async (req, res) => {
  try {
    const storeId = req.storeId.toString();

    const { documentName, text, category, medicineName, source, tags, description } = req.body;

    if (!documentName?.trim() || !text?.trim())
      return res.status(400).json({ success: false, message: 'documentName and text required' });

    const buffer    = Buffer.from(text.trim(), 'utf-8');
    const fileSize  = buffer.length;

    /* ── Limits ── */
    if (fileSize > MAX_FILE_BYTES)
      return res.status(400).json({ success: false, message: `Text too large. Max ${MAX_FILE_MB}MB.` });

    const existingCount = await KnowledgeDocument.countDocuments({
      storeId: req.storeId, scope: 'store', status: { $ne: 'failed' },
    });
    if (existingCount >= MAX_DOCS)
      return res.status(400).json({ success: false, message: `Document limit of ${MAX_DOCS} reached.` });

    const sizeAgg = await KnowledgeDocument.aggregate([
      { $match: { storeId: req.storeId, scope: 'store', status: { $ne: 'failed' } } },
      { $group: { _id: null, totalSize: { $sum: '$fileSize' } } },
    ]);
    const currentBytes = sizeAgg[0]?.totalSize || 0;
    if (currentBytes + fileSize > MAX_TOTAL_BYTES)
      return res.status(400).json({ success: false, message: `Storage limit of ${MAX_TOTAL_MB}MB reached.` });

    const documentId = uuidv4();
    const doc = await KnowledgeDocument.create({
      documentId,
      documentName: documentName.trim(),
      originalName: 'text-input.txt',
      fileSize,
      mimeType:     'text/plain',
      storeId:      req.storeId,
      scope:        'store',
      category:     category || 'general',
      medicineName: medicineName?.trim()?.toLowerCase() || '',
      tags:         tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      source:       source?.trim() || '',
      description:  description?.trim() || '',
      status:       'processing',
      uploadedBy:   req.user._id,
      uploadedByName: req.user.name,
    });

    await qdrant.ensureCollection();

    ingestDocument({
      buffer, mimeType: 'text/plain', originalName: 'text-input.txt',
      documentId, documentName: documentName.trim(),
      category: category || 'general',
      medicineName: medicineName?.trim()?.toLowerCase() || '',
      source: source?.trim() || '',
      tags: doc.tags,
      storeId, scope: 'store',
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

    res.status(201).json({ success: true, document: doc, message: 'Text uploaded and being processed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── GET store documents ── */
exports.getDocuments = async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const query = { storeId: req.storeId, scope: 'store' };
    if (category) query.category = category;
    if (status)   query.status   = status;
    if (search)   query.$or = [
      { documentName: { $regex: search, $options: 'i' } },
      { medicineName: { $regex: search, $options: 'i' } },
      { description:  { $regex: search, $options: 'i' } },
    ];

    const docs = await KnowledgeDocument.find(query).sort({ createdAt: -1 }).lean();

    /* ── Storage usage ── */
    const usedBytes  = docs.filter(d => d.status !== 'failed').reduce((s, d) => s + (d.fileSize || 0), 0);
    const usedMB     = (usedBytes / 1024 / 1024).toFixed(2);
    const usagePercent = Math.round((usedBytes / MAX_TOTAL_BYTES) * 100);

    /* ── Vector count from Qdrant ── */
    const vectorCount = await qdrant.countStoreVectors(req.storeId.toString());

    res.json({
      success: true,
      documents: docs,
      usage: {
        docs:          docs.filter(d => d.status !== 'failed').length,
        maxDocs:       MAX_DOCS,
        docsRemaining: MAX_DOCS - docs.filter(d => d.status !== 'failed').length,
        usedBytes,
        usedMB,
        maxMB:         MAX_TOTAL_MB,
        mbRemaining:   (MAX_TOTAL_MB - Number(usedMB)).toFixed(2),
        usagePercent,
        vectorCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── DELETE document ── */
exports.deleteDocument = async (req, res) => {
  try {
    const doc = await KnowledgeDocument.findOne({
      _id:     req.params.id,
      storeId: req.storeId,
      scope:   'store',
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    /* ── Delete vectors from Qdrant ── */
    await qdrant.deleteStoreDocument(doc.documentId, req.storeId.toString());

    await doc.deleteOne();

    res.json({
      success: true,
      message: `"${doc.documentName}" deleted. ${doc.vectorCount} vectors removed.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ════════════════════════════════
   3-TIER QUERY ENDPOINT
   (for doctors & pharmacists)
════════════════════════════════ */
exports.query = async (req, res) => {
  try {
    const { query, medicineName, category, limit = 5 } = req.body;

    if (!query?.trim())
      return res.status(400).json({ success: false, message: 'Query is required' });

    const storeId = req.storeId.toString();

    const result = await storeQuery(query.trim(), storeId, {
      medicineName: medicineName || '',
      category:     category    || null,
      limit:        Number(limit),
    });

    /* ── Describe which tier answered ── */
    let sourceTier = 'ai_knowledge';
    if (result.storeTier > 0 && result.globalTier === 0) sourceTier = 'store_only';
    else if (result.storeTier > 0 && result.globalTier > 0) sourceTier = 'store_and_global';
    else if (result.storeTier === 0 && result.globalTier > 0) sourceTier = 'global_only';

    res.json({
      success: true,
      ...result,
      sourceTier,
      tierDescription: {
        store_only:        '📋 Answered from your clinic\'s knowledge base',
        store_and_global:  '📋+🌐 Answered from clinic knowledge + clinical database',
        global_only:       '🌐 Answered from clinical database',
        ai_knowledge:      '🤖 Answered from AI training knowledge (no documents matched)',
      }[sourceTier],
    });
  } catch (err) {
    console.error('[StoreRAG] Query error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Medicine-specific query ── */
exports.queryMedicine = async (req, res) => {
  try {
    const { name } = req.params;
    const { query: extraQuery } = req.query;

    if (!name?.trim())
      return res.status(400).json({ success: false, message: 'Medicine name required' });

    const storeId = req.storeId.toString();
    const fullQuery = extraQuery
      ? `${name}: ${extraQuery}`
      : `${name} — uses, dosage, side effects, contraindications, drug interactions, availability in Pakistan`;

    const result = await storeQuery(fullQuery, storeId, {
      medicineName: name.trim(),
      limit: 5,
    });

    let sourceTier = 'ai_knowledge';
    if (result.storeTier > 0 && result.globalTier === 0) sourceTier = 'store_only';
    else if (result.storeTier > 0 && result.globalTier > 0) sourceTier = 'store_and_global';
    else if (result.storeTier === 0 && result.globalTier > 0) sourceTier = 'global_only';

    res.json({ success: true, medicineName: name, ...result, sourceTier });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Usage stats ── */
exports.getStats = async (req, res) => {
  try {
    const [docs, vectorCount] = await Promise.all([
      KnowledgeDocument.find({ storeId: req.storeId, scope: 'store' }).lean(),
      qdrant.countStoreVectors(req.storeId.toString()),
    ]);

    const ready      = docs.filter(d => d.status === 'ready');
    const processing = docs.filter(d => d.status === 'processing');
    const failed     = docs.filter(d => d.status === 'failed');
    const usedBytes  = ready.reduce((s, d) => s + (d.fileSize || 0), 0);

    res.json({
      success: true,
      stats: {
        totalDocs:     docs.length,
        readyDocs:     ready.length,
        processingDocs:processing.length,
        failedDocs:    failed.length,
        vectorCount,
        usedMB:        (usedBytes / 1024 / 1024).toFixed(2),
        maxDocs:       MAX_DOCS,
        maxMB:         MAX_TOTAL_MB,
        usagePercent:  Math.round((usedBytes / MAX_TOTAL_BYTES) * 100),
        docsRemaining: MAX_DOCS - ready.length - processing.length,
        mbRemaining:   (MAX_TOTAL_MB - usedBytes / 1024 / 1024).toFixed(2),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};