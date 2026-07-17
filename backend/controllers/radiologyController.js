const RadiologyStudy = require('../models/RadiologyStudy');
const Patient        = require('../models/Patient');
const cloudinaryUtil = require('../utils/cloudinary');
const crypto         = require('crypto');
const { emitToStore }= require('../socket');

const MODALITIES = ['X-Ray','Ultrasound','CT Scan','MRI','Mammography',
  'Fluoroscopy','Nuclear Medicine','Angiography','Echocardiography',
  'Doppler','DEXA Scan','Other'];

/* ── GET all studies ── */
exports.getAll = async (req, res) => {
  try {
    const {
      modality, status, patientId, search,
      priority, page = 1, limit = 20,
    } = req.query;

    const query = { storeId: req.storeId };
    if (modality)  query.modality   = modality;
    if (status)    query.status     = status;
    if (patientId) query.patient    = patientId;
    if (priority)  query.priority   = priority;
    if (search)    query.$or = [
      { patientName:  { $regex: search, $options: 'i' } },
      { studyType:    { $regex: search, $options: 'i' } },
      { studyNumber:  { $regex: search, $options: 'i' } },
      { referredBy:   { $regex: search, $options: 'i' } },
      { radiologist:  { $regex: search, $options: 'i' } },
    ];

    const result = await RadiologyStudy.paginate(query, {
      page: Number(page), limit: Number(limit),
      sort: { studyDate: -1, createdAt: -1 },
      populate: [{ path: 'patient', select: 'patientId age gender phone' }],
      lean: true, leanWithId: false,
    });

    res.json({
      success:    true,
      studies:    result.docs,
      total:      result.totalDocs,
      totalPages: result.totalPages,
      page:       result.page,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET single study ── */
exports.getOne = async (req, res) => {
  try {
    const study = await RadiologyStudy.findOne({ _id: req.params.id, storeId: req.storeId })
      .populate('patient',    'name patientId age gender phone bloodGroup')
      .populate('orderedBy',  'name')
      .populate('reportedBy', 'name')
      .populate('verifiedBy', 'name');

    if (!study) return res.status(404).json({ success: false, message: 'Study not found' });
    res.json({ success: true, study });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET study history for a patient ── */
exports.getPatientHistory = async (req, res) => {
  try {
    const { patientId } = req.params;
    const studies = await RadiologyStudy.find({
      storeId: req.storeId,
      patient: patientId,
      status:  { $ne: 'Cancelled' },
    })
      .sort({ studyDate: -1, createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, studies });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET public share view (no auth) ── */
exports.getShared = async (req, res) => {
  try {
    const { token } = req.params;
    const study = await RadiologyStudy.findOne({
      shareToken:   token,
      shareEnabled: true,
    }).populate('patient', 'name patientId age gender bloodGroup');

    if (!study) return res.status(404).json({ success: false, message: 'Shared report not found or link expired' });

    // Check expiry
    if (study.shareExpiresAt && study.shareExpiresAt < new Date()) {
      return res.status(410).json({ success: false, message: 'This share link has expired' });
    }

    // Return safe public data (no PHI beyond what doctor shared)
    res.json({
      success: true,
      study: {
        studyNumber:    study.studyNumber,
        modality:       study.modality,
        studyType:      study.studyType,
        bodyPart:       study.bodyPart,
        laterality:     study.laterality,
        studyDate:      study.studyDate,
        reportDate:     study.reportDate,
        patient: {
          name:      study.patient?.name,
          patientId: study.patient?.patientId,
          age:       study.patient?.age,
          gender:    study.patient?.gender,
        },
        radiologist:    study.radiologist,
        clinicalHistory:study.clinicalHistory,
        report:         study.report,
        images:         study.images.map(img => ({
          _id:         img._id,
          title:       img.title,
          description: img.description,
          url:         img.file.url,
          format:      img.file.format,
          mimetype:    img.file.mimetype,
          uploadedAt:  img.uploadedAt,
        })),
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── CREATE study (order) ── */
exports.create = async (req, res) => {
  try {
    const {
      patientId, admissionId, modality, studyType, bodyPart, laterality,
      contrast, contrastAgent, clinicalHistory, referredBy, priority,
      studyDate, radiologist, notes, cost,
    } = req.body;

    if (!patientId || !modality || !studyType)
      return res.status(400).json({ success: false, message: 'Patient, modality and study type are required' });

    const patient = await Patient.findOne({ _id: patientId, storeId: req.storeId });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const study = await RadiologyStudy.create({
      storeId:      req.storeId,
      patient:      patientId,
      patientName:  patient.name,
      admission:    admissionId || null,
      modality, studyType,
      bodyPart:       bodyPart      || '',
      laterality:     laterality    || 'N/A',
      contrast:       !!contrast,
      contrastAgent:  contrastAgent || '',
      clinicalHistory:clinicalHistory || '',
      referredBy:     referredBy    || '',
      priority:       priority      || 'Routine',
      studyDate:      studyDate ? new Date(studyDate) : new Date(),
      radiologist:    radiologist   || '',
      notes:          notes         || '',
      cost:           Number(cost   || 0),
      orderedBy:      req.user._id,
    });

    // STAT/Emergency alert
    if (['STAT','Emergency'].includes(priority)) {
      emitToStore(req.storeId, 'radiology:urgent', {
        studyId:     study._id,
        studyNumber: study.studyNumber,
        modality, studyType,
        patientName: patient.name,
        priority,
        orderedBy:   req.user.name,
      });
    }

    const populated = await RadiologyStudy.findById(study._id)
      .populate('patient', 'patientId age gender phone');
    res.status(201).json({ success: true, study: populated, message: `${modality} study ordered — ${study.studyNumber}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── UPLOAD images to a study ── */
exports.uploadImages = async (req, res) => {
  try {
    const study = await RadiologyStudy.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!study) return res.status(404).json({ success: false, message: 'Study not found' });
    if (study.status === 'Cancelled') return res.status(400).json({ success: false, message: 'Cannot upload to cancelled study' });

    if (!req.files?.length && !req.file)
      return res.status(400).json({ success: false, message: 'No files uploaded' });

    const files   = req.files || [req.file];
    const titles  = req.body.titles  ? JSON.parse(req.body.titles)  : [];
    const descs   = req.body.descs   ? JSON.parse(req.body.descs)   : [];

    const uploaded = [];

    for (let i = 0; i < files.length; i++) {
      const file    = files[i];
      const isPDF   = file.mimetype === 'application/pdf';
      const folder  = `medistore/${req.storeId}/radiology/${study._id}`;
      const pubId   = `${study.studyNumber}_img${study.images.length + i + 1}_${Date.now()}`;

      const result = await cloudinaryUtil.uploadBuffer(
        file.buffer, file.mimetype, folder, pubId
      );

      uploaded.push({
        title:       titles[i] || `Image ${study.images.length + i + 1}`,
        description: descs[i]  || '',
        file: {
          url:          result.secure_url,
          publicId:     result.public_id,
          originalName: file.originalname,
          mimetype:     file.mimetype,
          size:         file.size,
          format:       result.format,
          resourceType: isPDF ? 'raw' : 'image',
        },
        uploadedAt:     new Date(),
        uploadedBy:     req.user._id,
        uploadedByName: req.user.name,
      });
    }

    study.images.push(...uploaded);

    // Auto-advance status
    if (study.status === 'Ordered' || study.status === 'In Progress') {
      study.status = 'Images Uploaded';
    }

    await study.save();

    emitToStore(req.storeId, 'radiology:imagesUploaded', {
      studyId:     study._id,
      studyNumber: study.studyNumber,
      patientName: study.patientName,
      modality:    study.modality,
      count:       uploaded.length,
    });

    res.json({ success: true, study, message: `${uploaded.length} image(s) uploaded to ${study.studyNumber}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── DELETE single image ── */
exports.deleteImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const study = await RadiologyStudy.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!study) return res.status(404).json({ success: false, message: 'Study not found' });

    const image = study.images.id(imageId);
    if (!image) return res.status(404).json({ success: false, message: 'Image not found' });

    // Delete from Cloudinary
    if (image.file?.publicId) {
      await cloudinaryUtil.deleteFile(image.file.publicId, image.file.mimetype).catch(() => {});
    }

    study.images = study.images.filter(img => img._id.toString() !== imageId);
    await study.save();

    res.json({ success: true, study, message: 'Image deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── SUBMIT / UPDATE report ── */
exports.submitReport = async (req, res) => {
  try {
    const {
      technique, findings, impression, recommendation,
      isNormal, isCritical, criticalAlert, radiologist,
    } = req.body;

    if (!findings || !impression)
      return res.status(400).json({ success: false, message: 'Findings and impression required' });

    const study = await RadiologyStudy.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!study) return res.status(404).json({ success: false, message: 'Study not found' });
    if (study.status === 'Cancelled') return res.status(400).json({ success: false, message: 'Study is cancelled' });

    study.report = { technique, findings, impression, recommendation, isNormal: !!isNormal, isCritical: !!isCritical, criticalAlert };
    study.radiologist   = radiologist || study.radiologist;
    study.reportDate    = new Date();
    study.reportedBy    = req.user._id;
    study.status        = 'Reported';

    await study.save();
    await study.populate('patient', 'name patientId age gender');

    // Critical finding alert
    if (isCritical) {
      emitToStore(req.storeId, 'radiology:critical', {
        studyId:       study._id,
        studyNumber:   study.studyNumber,
        patientName:   study.patientName,
        modality:      study.modality,
        studyType:     study.studyType,
        criticalAlert,
        radiologist:   radiologist || req.user.name,
      });
    }

    res.json({ success: true, study, message: `Report submitted for ${study.studyNumber}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── VERIFY report (senior radiologist) ── */
exports.verifyReport = async (req, res) => {
  try {
    const study = await RadiologyStudy.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!study) return res.status(404).json({ success: false, message: 'Study not found' });
    if (study.status !== 'Reported') return res.status(400).json({ success: false, message: 'Only reported studies can be verified' });

    study.status     = 'Verified';
    study.verifiedBy = req.user._id;
    await study.save();

    res.json({ success: true, study, message: `${study.studyNumber} verified` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── UPDATE status ── */
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const study = await RadiologyStudy.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!study) return res.status(404).json({ success: false, message: 'Study not found' });
    study.status = status;
    await study.save();
    res.json({ success: true, study, message: `Status → ${status}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GENERATE / REVOKE share link ── */
exports.generateShareLink = async (req, res) => {
  try {
    const { expiryDays = 7 } = req.body;
    const study = await RadiologyStudy.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!study) return res.status(404).json({ success: false, message: 'Study not found' });

    if (!['Reported','Verified'].includes(study.status))
      return res.status(400).json({ success: false, message: 'Only reported studies can be shared' });

    study.shareToken    = crypto.randomBytes(32).toString('hex');
    study.shareEnabled  = true;
    const expiry        = new Date();
    expiry.setDate(expiry.getDate() + Number(expiryDays));
    study.shareExpiresAt = expiry;

    await study.save();

    const shareUrl = `${process.env.FRONTEND_URL}/radiology/${study.shareToken}`;
    res.json({ success: true, shareUrl, shareToken: study.shareToken, expiresAt: study.shareExpiresAt, message: 'Share link generated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── REVOKE share link ── */
exports.revokeShareLink = async (req, res) => {
  try {
    const study = await RadiologyStudy.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!study) return res.status(404).json({ success: false, message: 'Study not found' });
    study.shareEnabled  = false;
    study.shareToken    = null;
    study.shareExpiresAt= null;
    await study.save();
    res.json({ success: true, message: 'Share link revoked' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── DELETE study ── */
exports.remove = async (req, res) => {
  try {
    const study = await RadiologyStudy.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!study) return res.status(404).json({ success: false, message: 'Study not found' });

    // Delete all images from Cloudinary
    for (const img of study.images) {
      if (img.file?.publicId) {
        await cloudinaryUtil.deleteFile(img.file.publicId, img.file.mimetype).catch(() => {});
      }
    }

    await RadiologyStudy.findByIdAndDelete(study._id);
    res.json({ success: true, message: 'Study deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET stats ── */
exports.getStats = async (req, res) => {
  try {
    const [byStatus, byModality, critical, today] = await Promise.all([
      RadiologyStudy.aggregate([
        { $match: { storeId: req.storeId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      RadiologyStudy.aggregate([
        { $match: { storeId: req.storeId, status: { $ne: 'Cancelled' } } },
        { $group: { _id: '$modality', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      RadiologyStudy.countDocuments({ storeId: req.storeId, 'report.isCritical': true, status: 'Reported' }),
      RadiologyStudy.countDocuments({
        storeId: req.storeId,
        studyDate: { $gte: new Date().setHours(0,0,0,0) },
      }),
    ]);

    const statusMap = Object.fromEntries(byStatus.map(s => [s._id, s.count]));

    res.json({
      success: true,
      stats: {
        ordered:        statusMap.Ordered         || 0,
        inProgress:     statusMap['In Progress']  || 0,
        imagesUploaded: statusMap['Images Uploaded']|| 0,
        reported:       statusMap.Reported        || 0,
        verified:       statusMap.Verified        || 0,
        totalStudies:   Object.values(statusMap).reduce((s,v) => s+v, 0),
        criticalPending:critical,
        today,
        byModality,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};