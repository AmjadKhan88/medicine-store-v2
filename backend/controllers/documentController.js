const Document       = require('../models/Document');
const cloudinaryUtil = require('../utils/cloudinary');

/* ── Get all documents (filterable) ── */
exports.getAll = async (req, res) => {
  try {
    const {
      entityType, entityId, category,
      search, archived, page = 1, limit = 20,
    } = req.query;

    const query = { storeId: req.storeId };
    if (entityType)              query.entityType = entityType;
    if (entityId)                query.entityId   = entityId;
    if (category)                query.category   = category;
    if (archived === 'true')     query.isArchived = true;
    else                         query.isArchived = false;
    if (search) query.$or = [
      { title:      { $regex: search, $options: 'i' } },
      { entityName: { $regex: search, $options: 'i' } },
      { notes:      { $regex: search, $options: 'i' } },
      { tags:       { $regex: search, $options: 'i' } },
    ];

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      Document.find(query)
        .populate('uploadedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip).limit(Number(limit)),
      Document.countDocuments(query),
    ]);

    res.json({ success: true, documents: docs, total, totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Get documents for one entity ── */
exports.getForEntity = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const docs = await Document.find({
      storeId: req.storeId,
      entityType,
      entityId,
      isArchived: false,
    })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, documents: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Upload document ── */
exports.upload = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { entityType, entityId, entityName, title, category, notes, tags } = req.body;

    if (!entityType || !entityId || !title)
      return res.status(400).json({ success: false, message: 'entityType, entityId and title are required' });

    // Determine Cloudinary resource type
    const isPDF      = req.file.mimetype === 'application/pdf';
    const resourceType = isPDF ? 'raw' : 'image';
    const folder     = `medistore/${req.storeId}/documents/${entityType}`;
    const publicId   = `${entityType}_${entityId}_${Date.now()}`;

    const result = await cloudinaryUtil.uploadBuffer(
      req.file.buffer,
      req.file.mimetype,
      folder,
      publicId
    );

    const doc = await Document.create({
      storeId:    req.storeId,
      uploadedBy: req.user._id,
      entityType,
      entityId,
      entityName: entityName || '',
      title:      title.trim(),
      category:   category || 'Other',
      notes:      notes    || '',
      tags:       tags ? JSON.parse(tags) : [],
      file: {
        url:          result.secure_url,
        publicId:     result.public_id,
        originalName: req.file.originalname,
        mimetype:     req.file.mimetype,
        size:         req.file.size,
        format:       result.format,
        resourceType,
      },
    });

    res.status(201).json({ success: true, document: doc, message: `"${title}" uploaded successfully` });
  } catch (err) {
    console.error('[Document Upload]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Update metadata (no file change) ── */
exports.update = async (req, res) => {
  try {
    const { title, category, notes, tags } = req.body;
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { title, category, notes, tags },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, document: doc, message: 'Document updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Archive / unarchive ── */
exports.toggleArchive = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    doc.isArchived = !doc.isArchived;
    await doc.save();
    res.json({ success: true, document: doc, message: doc.isArchived ? 'Document archived' : 'Document restored' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Delete permanently ── */
exports.remove = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    // Delete from Cloudinary
    if (doc.file?.publicId) {
      await cloudinaryUtil.deleteFile(doc.file.publicId, doc.file.mimetype).catch(() => {});
    }

    await Document.findByIdAndDelete(doc._id);
    res.json({ success: true, message: 'Document deleted permanently' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Stats ── */
exports.getStats = async (req, res) => {
  try {
    const [total, byType, byCategory] = await Promise.all([
      Document.countDocuments({ storeId: req.storeId, isArchived: false }),
      Document.aggregate([
        { $match: { storeId: req.storeId, isArchived: false } },
        { $group: { _id: '$entityType', count: { $sum: 1 }, totalSize: { $sum: '$file.size' } } },
      ]),
      Document.aggregate([
        { $match: { storeId: req.storeId, isArchived: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
    ]);

    const totalSize = byType.reduce((s, t) => s + (t.totalSize || 0), 0);
    res.json({ success: true, stats: { total, byType, byCategory, totalSize } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};