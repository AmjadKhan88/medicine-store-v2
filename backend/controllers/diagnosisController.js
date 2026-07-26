const { GoogleGenerativeAI } = require('@google/generative-ai');
const DiagnosisSession = require('../models/DiagnosisSession');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ── System prompt — Pakistani clinical context ── */
const SYSTEM_PROMPT = `You are an AI clinical decision support assistant embedded in MediStore, a hospital management system used by doctors in Pakistan (including rural and semi-urban areas).

Your role is to assist doctors — NOT replace them. Always maintain this context:
- Pakistan's disease burden: TB, typhoid, malaria, dengue, hepatitis B/C, diabetes, hypertension, malnutrition
- Available drugs in Pakistan: consider what is realistically available (generics preferred)
- Limited specialist access in rural areas — flag when referral is needed
- Local factors: seasonal diseases (monsoon: cholera, dengue; winter: pneumonia)
- Drug pricing sensitivity — Pakistani patients often stop medications due to cost

IMPORTANT RULES:
1. Always include a clear disclaimer that AI assists but NEVER replaces clinical judgment
2. Always flag red flag symptoms that need emergency referral
3. List differential diagnoses with approximate probability percentages (must sum to ~100%)
4. Suggest investigations available in Pakistani district hospitals
5. Reference WHO/Pakistan clinical guidelines where applicable
6. Never recommend drugs not available in Pakistan
7. Flag drug interactions and contraindications
8. Consider co-morbidities common in Pakistan (DM, HTN, Hep B/C)

Respond ONLY with valid JSON — no markdown, no extra text.`;

/* ── GET all sessions for this store ── */
exports.getSessions = async (req, res) => {
  try {
    const { page = 1, limit = 20, patientId } = req.query;
    const query = { storeId: req.storeId };
    if (patientId) query.patient = patientId;

    const sessions = await DiagnosisSession.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('patient', 'name patientId age gender')
      .lean();

    const total = await DiagnosisSession.countDocuments(query);
    res.json({ success: true, sessions, total, totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET single session ── */
exports.getSession = async (req, res) => {
  try {
    const session = await DiagnosisSession.findOne({ _id: req.params.id, storeId: req.storeId })
      .populate('patient', 'name patientId age gender phone bloodGroup allergies');
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    res.json({ success: true, session });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── CREATE / ANALYZE ── */
exports.analyze = async (req, res) => {
  try {
    const {
      patientId,
      patientAge, patientGender, patientName,
      chiefComplaint,
      symptoms,            // array of strings
      duration,
      vitals,              // { bp, pulse, temp, spo2, rbs, weight, height }
      labResults,          // free text or structured
      existingConditions,  // array: ['Diabetes','Hypertension']
      currentMedications,  // array of strings
      allergies,
      additionalHistory,
      sessionId,           // if continuing existing session
    } = req.body;

    if (!chiefComplaint || !patientAge)
      return res.status(400).json({ success: false, message: 'Chief complaint and patient age are required' });

    /* ── Build clinical context ── */
    const clinicalData = {
      patient: {
        age:     patientAge,
        gender:  patientGender || 'Unknown',
        name:    patientName   || 'Anonymous',
      },
      chiefComplaint,
      symptoms:            symptoms || [],
      duration:            duration || '',
      vitals:              vitals   || {},
      labResults:          labResults || '',
      existingConditions:  existingConditions || [],
      currentMedications:  currentMedications || [],
      allergies:           allergies || [],
      additionalHistory:   additionalHistory || '',
    };

    /* ── Build conversation history ── */
    let history = [];
    let existingSession = null;

    if (sessionId) {
      existingSession = await DiagnosisSession.findOne({ _id: sessionId, storeId: req.storeId });
      if (existingSession) history = existingSession.conversationHistory || [];
    }

    /* ── Compose the user message ── */
    const userMessage = `Analyze this patient case and provide clinical decision support.

PATIENT DATA:
- Age: ${clinicalData.patient.age} years
- Gender: ${clinicalData.patient.gender}
- Chief Complaint: ${clinicalData.chiefComplaint}
- Symptom Duration: ${clinicalData.duration || 'Not specified'}

SYMPTOMS:
${clinicalData.symptoms.length ? clinicalData.symptoms.map(s => `• ${s}`).join('\n') : '• Not specified'}

VITALS:
${Object.entries(clinicalData.vitals).filter(([,v])=>v).map(([k,v]) => `• ${k}: ${v}`).join('\n') || '• Not recorded'}

LAB RESULTS:
${clinicalData.labResults || 'None provided'}

EXISTING CONDITIONS:
${clinicalData.existingConditions.length ? clinicalData.existingConditions.join(', ') : 'None'}

CURRENT MEDICATIONS:
${clinicalData.currentMedications.length ? clinicalData.currentMedications.join(', ') : 'None'}

ALLERGIES:
${clinicalData.allergies.length ? clinicalData.allergies.join(', ') : 'NKDA'}

ADDITIONAL HISTORY:
${clinicalData.additionalHistory || 'None'}

Return ONLY this JSON structure:
{
  "summary": "Brief 1-2 sentence clinical summary",
  "redFlags": [
    { "symptom": "...", "significance": "...", "action": "Immediate/Urgent/Monitor" }
  ],
  "differentials": [
    {
      "diagnosis": "Disease name",
      "probability": 35,
      "icd10": "A00.0",
      "reasoning": "Why this diagnosis fits",
      "supportingFeatures": ["feature1","feature2"],
      "againstFeatures": ["feature1"]
    }
  ],
  "investigations": [
    {
      "test": "Test name",
      "priority": "Urgent/Routine/Optional",
      "rationale": "Why this test",
      "availableInPakistan": true,
      "estimatedCost": "PKR range"
    }
  ],
  "treatment": {
    "immediate": ["Action 1","Action 2"],
    "medications": [
      {
        "drug": "Drug name",
        "dose": "...",
        "frequency": "...",
        "duration": "...",
        "notes": "...",
        "availableInPakistan": true
      }
    ],
    "nonPharmacological": ["Advice 1","Advice 2"],
    "followUp": "When and what to monitor",
    "referral": {
      "needed": false,
      "specialty": null,
      "urgency": null,
      "reason": null
    }
  },
  "clinicalPearls": ["Pearl 1","Pearl 2"],
  "pakistanSpecificNotes": "Any specific notes for Pakistani clinical context",
  "confidenceLevel": "high|medium|low",
  "disclaimer": "AI clinical decision support only. Final diagnosis and treatment decisions must be made by a licensed physician based on complete clinical assessment."
}`;

    /* ── Call Gemini ── */
    const model = genAI.getGenerativeModel({
      model:          'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const chat = model.startChat({
      history: history.map(h => ({
        role:  h.role,
        parts: [{ text: h.content }],
      })),
    });

    const result   = await chat.sendMessage(userMessage);
    const rawText  = result.response.text().trim();

    /* ── Parse JSON ── */
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Gemini returned invalid format');

    const analysis = JSON.parse(jsonMatch[0]);

    /* ── Save / update session ── */
    const newHistory = [
      ...history,
      { role: 'user', content: userMessage, timestamp: new Date() },
      { role: 'model', content: rawText, timestamp: new Date() },
    ];

    let session;
    if (existingSession) {
      existingSession.conversationHistory = newHistory;
      existingSession.lastAnalysis        = analysis;
      existingSession.clinicalData        = clinicalData;
      existingSession.updatedAt           = new Date();
      await existingSession.save();
      session = existingSession;
    } else {
      session = await DiagnosisSession.create({
        storeId:   req.storeId,
        patient:   patientId || null,
        patientName: clinicalData.patient.name,
        patientAge:  clinicalData.patient.age,
        patientGender: clinicalData.patient.gender,
        chiefComplaint,
        clinicalData,
        lastAnalysis:        analysis,
        conversationHistory: newHistory,
        doctorId:            req.user._id,
        doctorName:          req.user.name,
        hasRedFlags:         (analysis.redFlags?.length > 0),
        hasReferral:         (analysis.treatment?.referral?.needed === true),
      });
    }

    res.json({ success: true, analysis, sessionId: session._id, message: 'Analysis complete' });
  } catch (err) {
    if (err.message?.includes('API_KEY')) {
      return res.status(500).json({ success: false, message: 'Gemini API key not configured' });
    }
    if (err instanceof SyntaxError) {
      return res.status(500).json({ success: false, message: 'AI response could not be parsed. Please try again.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── FOLLOW-UP question in existing session ── */
exports.followUp = async (req, res) => {
  try {
    const { sessionId, question } = req.body;
    if (!sessionId || !question)
      return res.status(400).json({ success: false, message: 'sessionId and question required' });

    const session = await DiagnosisSession.findOne({ _id: sessionId, storeId: req.storeId });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const model = genAI.getGenerativeModel({
      model:             'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const chat = model.startChat({
      history: (session.conversationHistory || []).map(h => ({
        role:  h.role,
        parts: [{ text: h.content }],
      })),
    });

    const result  = await chat.sendMessage(question);
    const rawText = result.response.text().trim();

    session.conversationHistory.push(
      { role: 'user',  content: question, timestamp: new Date() },
      { role: 'model', content: rawText,  timestamp: new Date() }
    );
    await session.save();

    res.json({ success: true, response: rawText, sessionId });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── DELETE session ── */
exports.deleteSession = async (req, res) => {
  try {
    await DiagnosisSession.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    res.json({ success: true, message: 'Session deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};