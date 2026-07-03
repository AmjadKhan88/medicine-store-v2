const LabTest = require('../models/LabTest');
const Patient = require('../models/Patient');

/* ── Get all lab tests ── */
exports.getAll = async (req, res) => {
  try {
    const { patientId, status, category, search, page = 1, limit = 20 } = req.query;
    const query = { storeId: req.storeId };

    if (patientId) query.patient     = patientId;
    if (status)    query.status      = status;
    if (category)  query.testCategory= category;
    if (search)    query.$or         = [
      { testName:   { $regex: search, $options: 'i' } },
      { patientName:{ $regex: search, $options: 'i' } },
      { orderedBy:  { $regex: search, $options: 'i' } },
      { lab:        { $regex: search, $options: 'i' } },
    ];

    const skip = (Number(page) - 1) * Number(limit);
    const [tests, total] = await Promise.all([
      LabTest.find(query)
        // Exclude file.data from list (heavy) — only include metadata
        .select('-file.data')
        .populate('patient',            'patientId phone age gender')
        .populate('linkedPrescription', 'rxNumber')
        .populate('linkedAppointment',  'date timeSlot')
        .populate('createdBy',          'name')
        .sort({ createdAt: -1 })
        .skip(skip).limit(Number(limit)),
      LabTest.countDocuments(query),
    ]);

    res.json({ success: true, tests, total, totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Get single ── */
exports.getOne = async (req, res) => {
  try {
    const test = await LabTest.findOne({ _id: req.params.id, storeId: req.storeId })
      .select('-file.data')
      .populate('patient',            'name patientId phone age gender bloodGroup')
      .populate('linkedPrescription', 'rxNumber doctorName')
      .populate('linkedAppointment',  'date timeSlot type')
      .populate('createdBy',          'name');

    if (!test)
      return res.status(404).json({ success: false, message: 'Lab test not found' });

    res.json({ success: true, test });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Create lab test order ── */
exports.create = async (req, res) => {
  try {
    const {
      patient: patientId, testName, testCategory, orderedBy,
      lab, orderedDate, notes, linkedPrescription, linkedAppointment,
    } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient)
      return res.status(404).json({ success: false, message: 'Patient not found' });

    const test = await LabTest.create({
      storeId:     req.storeId,
      patient:     patientId,
      patientName: patient.name,
      testName,
      testCategory: testCategory || 'Blood Test',
      orderedBy,
      lab,
      orderedDate:  orderedDate ? new Date(orderedDate) : new Date(),
      notes,
      linkedPrescription: linkedPrescription || null,
      linkedAppointment:  linkedAppointment  || null,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, test, message: `Lab test "${testName}" ordered` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Update test (status, result, result rows) ── */
exports.update = async (req, res) => {
  try {
    const {
      status, result, resultRows,
      collectedDate, resultDate,
      orderedBy, lab, notes,
      linkedPrescription, linkedAppointment,
    } = req.body;

    const updateData = {};
    if (status)             updateData.status     = status;
    if (result)             updateData.result     = result;
    if (resultRows)         updateData.resultRows = resultRows;
    if (collectedDate)      updateData.collectedDate = new Date(collectedDate);
    if (resultDate)         updateData.resultDate    = new Date(resultDate);
    if (orderedBy !== undefined) updateData.orderedBy = orderedBy;
    if (lab       !== undefined) updateData.lab        = lab;
    if (notes     !== undefined) updateData.notes      = notes;
    if (linkedPrescription !== undefined) updateData.linkedPrescription = linkedPrescription || null;
    if (linkedAppointment  !== undefined) updateData.linkedAppointment  = linkedAppointment  || null;

    const test = await LabTest.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      updateData,
      { new: true, runValidators: true }
    ).select('-file.data');

    if (!test)
      return res.status(404).json({ success: false, message: 'Lab test not found' });

    res.json({ success: true, test, message: 'Lab test updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Upload result file (PDF or image) ── */
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'No file uploaded' });

    const test = await LabTest.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      {
        file: {
          originalName: req.file.originalname,
          mimetype:     req.file.mimetype,
          size:         req.file.size,
          data:         req.file.buffer,
          uploadedAt:   new Date(),
        },
        // Auto-set to completed if uploading result
        status: 'Completed',
      },
      { new: true }
    ).select('-file.data');

    if (!test)
      return res.status(404).json({ success: false, message: 'Lab test not found' });

    res.json({
      success: true,
      test,
      fileInfo: {
        originalName: req.file.originalname,
        mimetype:     req.file.mimetype,
        size:         req.file.size,
      },
      message: 'File uploaded successfully',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Download / view the uploaded file ── */
exports.downloadFile = async (req, res) => {
  try {
    const test = await LabTest.findOne(
      { _id: req.params.id, storeId: req.storeId },
      'file'
    );

    if (!test || !test.file?.data)
      return res.status(404).json({ success: false, message: 'No file found for this test' });

    res.set('Content-Type',        test.file.mimetype);
    res.set('Content-Disposition', `inline; filename="${test.file.originalName}"`);
    res.set('Content-Length',      test.file.size);
    res.send(test.file.data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Delete file ── */
exports.deleteFile = async (req, res) => {
  try {
    await LabTest.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { $unset: { file: 1 } }
    );
    res.json({ success: true, message: 'File removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Cancel test ── */
exports.cancel = async (req, res) => {
  try {
    const test = await LabTest.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { status: 'Cancelled' },
      { new: true }
    ).select('-file.data');

    if (!test)
      return res.status(404).json({ success: false, message: 'Lab test not found' });

    res.json({ success: true, test, message: 'Test cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Patient test history ── */
exports.getPatientHistory = async (req, res) => {
  try {
    const tests = await LabTest.find({
      storeId: req.storeId,
      patient: req.params.patientId,
    })
      .select('-file.data')
      .populate('linkedPrescription', 'rxNumber')
      .sort({ createdAt: -1 });

    res.json({ success: true, tests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Stats ── */
exports.getStats = async (req, res) => {
  try {
    const [total, ordered, completed, critical] = await Promise.all([
      LabTest.countDocuments({ storeId: req.storeId }),
      LabTest.countDocuments({ storeId: req.storeId, status: { $in: ['Ordered', 'Sample Collected', 'In Progress'] } }),
      LabTest.countDocuments({ storeId: req.storeId, status: 'Completed' }),
      LabTest.countDocuments({ storeId: req.storeId, 'result.interpretation': 'Critical' }),
    ]);

    res.json({ success: true, stats: { total, ordered, completed, critical } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};