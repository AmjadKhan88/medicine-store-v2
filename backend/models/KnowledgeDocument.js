const mongoose = require('mongoose');

const knowledgeDocumentSchema = new mongoose.Schema({
  documentId:   { type: String, required: true, unique: true }, // UUID — matches Qdrant payload
  documentName: { type: String, required: true, trim: true },
  originalName: { type: String, trim: true },
  fileSize:     { type: Number },
  mimeType:     { type: String },

    /* ── Scope ── */
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,           // null = super admin global document
  },
  scope: {
    type: String,
    enum: ['global', 'store'],
    default: 'global',
  },

  category: {
    type: String,
    enum: ['medicine', 'service', 'protocol', 'guideline', 'formulary', 'general'],
    default: 'general',
  },
  medicineName: { type: String, trim: true, lowercase: true }, // for medicine-specific docs
  tags:         [{ type: String }],
  source:       { type: String, trim: true }, // e.g. "BNF 2024", "WHO Guidelines"
  description:  { type: String, trim: true },

  /* ── Ingestion stats ── */
  chunkCount:   { type: Number, default: 0 },
  vectorCount:  { type: Number, default: 0 },
  textLength:   { type: Number, default: 0 },
  status:       { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing' },
  errorMessage: { type: String },

  uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedByName:{ type: String },
}, { timestamps: true });

knowledgeDocumentSchema.index({ category: 1, medicineName: 1 });

module.exports = mongoose.model('KnowledgeDocument', knowledgeDocumentSchema);