const Patient = require('../models/Patient');

/* ── Levenshtein distance for fuzzy name matching ── */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

/* ── Normalize name: lowercase, remove titles, collapse spaces ── */
function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|dr|prof|haji|alhaj|syed|bibi|begum|sb|sahib)\b/g, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ── Phone normalize ── */
function normalizePhone(phone) {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  // Pakistan numbers: 03XXXXXXXXX → last 10 digits
  return digits.slice(-10);
}

/* ── Similarity score 0-100 ── */
function scorePair(p1, p2) {
  let score = 0;

  // ── Phone match (strongest signal) ──
  const ph1 = normalizePhone(p1.phone);
  const ph2 = normalizePhone(p2.phone);
  if (ph1 && ph2 && ph1 === ph2)           score += 60;
  else if (ph1 && ph2 && ph1.slice(-7) === ph2.slice(-7)) score += 35;

  // ── CNIC match ──
  const cnic1 = (p1.cnic || '').replace(/[^0-9]/g, '');
  const cnic2 = (p2.cnic || '').replace(/[^0-9]/g, '');
  if (cnic1 && cnic2 && cnic1 === cnic2)   score += 70;

  // ── Name similarity ──
  const n1 = normalizeName(p1.name);
  const n2 = normalizeName(p2.name);
  if (n1 && n2) {
    const dist    = levenshtein(n1, n2);
    const maxLen  = Math.max(n1.length, n2.length);
    const nameSim = Math.round((1 - dist / maxLen) * 100);
    if (nameSim === 100)      score += 40;
    else if (nameSim >= 85)   score += 25;
    else if (nameSim >= 70)   score += 12;

    // Shared tokens
    const tokens1 = new Set(n1.split(' ').filter(t => t.length > 2));
    const tokens2 = new Set(n2.split(' ').filter(t => t.length > 2));
    const shared  = [...tokens1].filter(t => tokens2.has(t)).length;
    score += shared * 8;
  }

  // ── Age match (±2 years) ──
  if (p1.age && p2.age && Math.abs(p1.age - p2.age) <= 2) score += 10;

  // ── Gender match ──
  if (p1.gender && p2.gender && p1.gender === p2.gender)   score += 5;

  // ── City match ──
  if (p1.city && p2.city && p1.city.toLowerCase() === p2.city.toLowerCase()) score += 8;

  return Math.min(100, score);
}

/* ── GET potential duplicates ── */
exports.findDuplicates = async (req, res) => {
  try {
    const { threshold = 65, limit = 50 } = req.query;
    const patients = await Patient.find({ storeId: req.storeId, isActive: true })
      .select('name phone cnic age gender city patientId totalBilled totalPaid createdAt')
      .limit(500)   // safety cap
      .lean();

    const pairs  = [];
    const seen   = new Set();

    for (let i = 0; i < patients.length; i++) {
      for (let j = i + 1; j < patients.length; j++) {
        const key = `${patients[i]._id}-${patients[j]._id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const score = scorePair(patients[i], patients[j]);
        if (score >= Number(threshold)) {
          pairs.push({
            score,
            confidence: score >= 85 ? 'High' : score >= 70 ? 'Medium' : 'Low',
            p1: patients[i],
            p2: patients[j],
            reasons: buildReasons(patients[i], patients[j]),
          });
        }
      }
    }

    // Sort by score descending
    pairs.sort((a, b) => b.score - a.score);

    res.json({ success: true, pairs: pairs.slice(0, Number(limit)), total: pairs.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

function buildReasons(p1, p2) {
  const reasons = [];
  const ph1 = normalizePhone(p1.phone), ph2 = normalizePhone(p2.phone);
  const n1  = normalizeName(p1.name),   n2  = normalizeName(p2.name);

  if (ph1 && ph2 && ph1 === ph2)                                   reasons.push('Same phone number');
  if (ph1 && ph2 && ph1 !== ph2 && ph1.slice(-7) === ph2.slice(-7))reasons.push('Similar phone number (last 7 digits match)');
  const c1 = (p1.cnic||'').replace(/\D/g,''), c2 = (p2.cnic||'').replace(/\D/g,'');
  if (c1 && c2 && c1 === c2)                                       reasons.push('Same CNIC number');

  const dist = levenshtein(n1, n2);
  const sim  = n1 && n2 ? Math.round((1 - dist / Math.max(n1.length, n2.length)) * 100) : 0;
  if (sim === 100)      reasons.push('Identical names');
  else if (sim >= 85)   reasons.push(`Very similar names (${sim}% match)`);
  else if (sim >= 70)   reasons.push(`Similar names (${sim}% match)`);

  const shared = [...new Set(n1.split(' ').filter(t=>t.length>2))]
    .filter(t => n2.split(' ').includes(t));
  if (shared.length)    reasons.push(`Shared name tokens: ${shared.join(', ')}`);

  if (p1.age && p2.age && Math.abs(p1.age-p2.age) <= 2) reasons.push(`Similar age (${p1.age} vs ${p2.age})`);
  if (p1.city && p2.city && p1.city.toLowerCase()===p2.city.toLowerCase()) reasons.push(`Same city: ${p1.city}`);

  return reasons;
}

/* ── MERGE two patients (keep p1, archive p2) ── */
exports.merge = async (req, res) => {
  try {
    const { keepId, mergeId, fieldOverrides } = req.body;
    if (!keepId || !mergeId) return res.status(400).json({ success: false, message: 'keepId and mergeId required' });
    if (keepId === mergeId)  return res.status(400).json({ success: false, message: 'Cannot merge a patient with itself' });

    const [keep, merge] = await Promise.all([
      Patient.findOne({ _id: keepId,  storeId: req.storeId }),
      Patient.findOne({ _id: mergeId, storeId: req.storeId }),
    ]);
    if (!keep)  return res.status(404).json({ success: false, message: 'Keep patient not found' });
    if (!merge) return res.status(404).json({ success: false, message: 'Merge patient not found' });

    // Apply field overrides (admin chose which fields to keep)
    const overrides = fieldOverrides || {};
    const FIELDS = ['phone','cnic','age','gender','city','address','email','bloodGroup','allergies','medicalHistory','doctor'];
    FIELDS.forEach(f => {
      if (overrides[f] === 'merge') {
        keep[f] = merge[f];
      } else if (overrides[f] === 'both' && Array.isArray(keep[f])) {
        keep[f] = [...new Set([...(keep[f]||[]), ...(merge[f]||[])])];
      }
    });

    // Merge financial totals
    keep.totalBilled = (keep.totalBilled || 0) + (merge.totalBilled || 0);
    keep.totalPaid   = (keep.totalPaid   || 0) + (merge.totalPaid   || 0);
    await keep.save();

    // Re-point all related records to keepId
    const mongoose = require('mongoose');
    const mergeOId = new mongoose.Types.ObjectId(mergeId);
    const keepOId  = new mongoose.Types.ObjectId(keepId);

    const models = ['Bill','Prescription','LabTest','Appointment','IPDAdmission',
      'VitalSign','Feedback','InsuranceClaim','RadiologyStudy','Broadcast','OPDQueue'];

    await Promise.all(models.map(async modelName => {
      try {
        const Model = require(`../models/${modelName}`);
        await Model.updateMany({ patient: mergeOId }, { $set: { patient: keepOId } });
      } catch {}
    }));

    // Archive (soft-delete) the merged patient
    merge.isActive   = false;
    merge.name       = `[MERGED → ${keep.patientId}] ${merge.name}`;
    await merge.save();

    res.json({
      success: true,
      patient: keep,
      message: `${merge.name.split(']').pop().trim()} merged into ${keep.name} (${keep.patientId}). All records re-pointed.`,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET single patient's potential duplicates ── */
exports.findForPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const target   = await Patient.findOne({ _id: patientId, storeId: req.storeId }).lean();
    if (!target) return res.status(404).json({ success: false, message: 'Patient not found' });

    const others   = await Patient.find({ storeId: req.storeId, isActive: true, _id: { $ne: patientId } })
      .select('name phone cnic age gender city patientId totalBilled createdAt')
      .limit(500).lean();

    const candidates = others
      .map(p => ({ score: scorePair(target, p), reasons: buildReasons(target, p), patient: p }))
      .filter(c => c.score >= 55)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.json({ success: true, target, candidates });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};