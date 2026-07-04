const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq                   = require('groq-sdk');
const Medicine               = require('../models/Medicine');
const Bill                   = require('../models/Bill');
const PurchaseOrder          = require('../models/PurchaseOrder');

/* ── Clients ── */
const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const groqClient   = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

/* ── Available models ── */
const MODELS = {
  'gemini-2.0-flash':     { provider: 'gemini', label: 'Gemini 2.0 Flash',        model: 'gemini-2.0-flash-exp' },
  'gemini-1.5-flash':     { provider: 'gemini', label: 'Gemini 1.5 Flash',        model: 'gemini-1.5-flash'     },
  'llama-3.3-70b':        { provider: 'groq',   label: 'Groq — Llama 3.3 70B',   model: 'llama-3.3-70b-versatile' },
  'llama-3.1-8b':         { provider: 'groq',   label: 'Groq — Llama 3.1 8B',    model: 'llama-3.1-8b-instant'    },
  'mixtral-8x7b':         { provider: 'groq',   label: 'Groq — Mixtral 8x7B',    model: 'mixtral-8x7b-32768'      },
  'gemma2-9b':            { provider: 'groq',   label: 'Groq — Gemma 2 9B',      model: 'gemma2-9b-it'            },
};

exports.getModels = (req, res) => {
  res.json({ success: true, models: MODELS });
};

/* ═══════════════════════════════════════
   Core AI call — routes to Gemini or Groq
═══════════════════════════════════════ */
async function callAI(modelKey, messages, systemPrompt = '') {
  const config = MODELS[modelKey];
  if (!config) throw new Error(`Unknown model: ${modelKey}`);

  if (config.provider === 'gemini') {
    const genAI = geminiClient.getGenerativeModel({
      model:             config.model,
      systemInstruction: systemPrompt,
    });
    const chat   = genAI.startChat({ history: [] });
    const result = await chat.sendMessage(messages[messages.length - 1].content);
    return result.response.text();
  }

  // Groq
  const completion = await groqClient.chat.completions.create({
    model:      config.model,
    messages:   [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    max_tokens:   1024,
    temperature:  0.4,
  });
  return completion.choices[0]?.message?.content || '';
}

/* ═══════════════════════════════════════
   MEDICINE ASSISTANT — general Q&A
═══════════════════════════════════════ */
exports.askAssistant = async (req, res) => {
  try {
    const { message, history = [], modelKey = 'gemini-2.0-flash' } = req.body;
    if (!message?.trim())
      return res.status(400).json({ success: false, message: 'Message is required' });

    // Fetch store's medicine list for context
    const medicines = await Medicine.find({
      storeId:  req.storeId,
      isActive: true,
    }).select('name genericName category dosageForm strength stock expiryDate salePrice').limit(200).lean();

    const inventoryContext = medicines.length > 0
      ? `\nCurrent pharmacy inventory (${medicines.length} medicines):\n` +
        medicines.map(m =>
          `- ${m.name} (${m.genericName || 'N/A'}) | ${m.category} | ${m.dosageForm} ${m.strength || ''} | Stock: ${m.stock} | Price: Rs.${m.salePrice}`
        ).join('\n')
      : '\nInventory: No medicines in the system yet.';

    const systemPrompt = `You are an expert pharmacy AI assistant for MediStore, a professional medicine store management system used in Pakistan.

Your role:
- Answer questions about medicines, dosages, side effects, drug interactions
- Help pharmacists and doctors make informed decisions
- Reference the pharmacy's inventory when relevant
- Always mention if a medicine is available in stock
- Recommend consulting a doctor for specific patient advice
- Use simple, clear English (avoid over-technical language)
- Keep responses concise and actionable
- Format responses with bullet points where helpful

Important rules:
- Never prescribe specific doses for individual patients
- Always recommend professional consultation for serious conditions
- Mention generic alternatives when available in inventory
- Flag drug interactions clearly
${inventoryContext}`;

    // Build conversation history
    const messages = [
      ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const response = await callAI(modelKey, messages, systemPrompt);

    res.json({ success: true, response, model: MODELS[modelKey]?.label || modelKey });
  } catch (err) {
    console.error('[AI Assistant]', err.message);
    res.status(500).json({ success: false, message: `AI error: ${err.message}` });
  }
};

/* ═══════════════════════════════════════
   AUTO-SUGGEST MEDICINE CATEGORY + DETAILS
═══════════════════════════════════════ */
exports.suggestMedicineDetails = async (req, res) => {
  try {
    const { name, modelKey = 'gemini-2.0-flash' } = req.body;
    if (!name?.trim())
      return res.status(400).json({ success: false, message: 'Medicine name is required' });

    const systemPrompt = `You are a pharmacy database assistant. Given a medicine name, return structured JSON data.
Always respond with ONLY valid JSON, no markdown, no explanation.`;

    const prompt = `Given the medicine name: "${name}"

Return a JSON object with these exact fields:
{
  "genericName": "the generic/INN name",
  "category": one of ["Antibiotic","Analgesic","Antiviral","Antifungal","Cardiovascular","Diabetes","Respiratory","Gastrointestinal","Neurological","Vitamin & Supplement","Dermatological","Other"],
  "dosageForm": one of ["Tablet","Capsule","Syrup","Injection","Cream","Drops","Inhaler","Patch","Other"],
  "strength": "common strength e.g. 500mg",
  "requiresPrescription": true or false,
  "description": "brief 1-line description",
  "commonSideEffects": ["effect1", "effect2", "effect3"],
  "interactions": ["drug1", "drug2"]
}`;

    const raw = await callAI(modelKey, [{ role: 'user', content: prompt }], systemPrompt);

    // Parse JSON safely
    let suggestion;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      suggestion  = JSON.parse(clean);
    } catch {
      // Try extracting JSON from response
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) suggestion = JSON.parse(match[0]);
      else throw new Error('Could not parse AI response as JSON');
    }

    res.json({ success: true, suggestion });
  } catch (err) {
    console.error('[AI Suggest]', err.message);
    res.status(500).json({ success: false, message: `AI error: ${err.message}` });
  }
};

/* ═══════════════════════════════════════
   DRUG INTERACTION CHECK — for bill items
═══════════════════════════════════════ */
exports.checkInteractions = async (req, res) => {
  try {
    const { medicines: medicineIds, modelKey = 'gemini-2.0-flash' } = req.body;
    if (!medicineIds?.length || medicineIds.length < 2)
      return res.json({ success: true, interactions: [], safe: true, message: 'Need at least 2 medicines to check interactions' });

    const meds = await Medicine.find({
      _id:     { $in: medicineIds },
      storeId: req.storeId,
    }).select('name genericName category').lean();

    if (meds.length < 2)
      return res.json({ success: true, interactions: [], safe: true });

    const medList = meds.map(m => `${m.name} (${m.genericName || m.category})`).join(', ');

    const systemPrompt = `You are a clinical pharmacist checking drug interactions. Respond ONLY with valid JSON.`;

    const prompt = `Check drug interactions for this combination: ${medList}

Respond with ONLY this JSON format (no markdown, no explanation):
{
  "safe": true or false,
  "severity": "none" | "minor" | "moderate" | "major",
  "interactions": [
    {
      "drug1": "medicine name",
      "drug2": "medicine name",
      "severity": "minor" | "moderate" | "major",
      "effect": "what happens",
      "recommendation": "what to do"
    }
  ],
  "summary": "one sentence overall assessment"
}

If no interactions found, return safe: true and empty interactions array.`;

    const raw = await callAI(modelKey, [{ role: 'user', content: prompt }], systemPrompt);

    let result;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      result = JSON.parse(clean);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      result = match ? JSON.parse(match[0]) : { safe: true, interactions: [], severity: 'none', summary: 'Could not analyze interactions.' };
    }

    res.json({ success: true, ...result, medicines: meds.map(m => m.name) });
  } catch (err) {
    console.error('[AI Interactions]', err.message);
    res.status(500).json({ success: false, message: `AI error: ${err.message}` });
  }
};

/* ═══════════════════════════════════════
   SMART REORDER SUGGESTIONS
═══════════════════════════════════════ */
exports.getReorderSuggestions = async (req, res) => {
  try {
    const { modelKey = 'gemini-2.0-flash' } = req.query;

    // Gather data: low stock + sales history
    const now          = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    const [lowStockMeds, topSellers, expiringSoon] = await Promise.all([
      Medicine.find({
        storeId:  req.storeId,
        isActive: true,
        $expr:    { $lte: ['$stock', '$minStock'] },
      }).select('name genericName category stock minStock purchasePrice unit').lean(),

      Bill.aggregate([
        { $match: { storeId: req.storeId, createdAt: { $gte: thirtyDaysAgo } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.medicine', name: { $first: '$items.medicineName' }, totalSold: { $sum: '$items.quantity' }, revenue: { $sum: '$items.totalPrice' } } },
        { $sort: { totalSold: -1 } },
        { $limit: 15 },
      ]),

      Medicine.find({
        storeId:    req.storeId,
        isActive:   true,
        expiryDate: { $gte: now, $lte: new Date(now.getTime() + 30 * 86400000) },
      }).select('name stock expiryDate').lean(),
    ]);

    const contextData = `
LOW STOCK MEDICINES (${lowStockMeds.length}):
${lowStockMeds.map(m => `- ${m.name}: current ${m.stock} ${m.unit}, min ${m.minStock}, unit cost Rs.${m.purchasePrice}`).join('\n') || 'None'}

TOP SELLING (last 30 days):
${topSellers.map(m => `- ${m.name}: ${m.totalSold} units sold, Rs.${m.revenue} revenue`).join('\n') || 'None'}

EXPIRING IN 30 DAYS:
${expiringSoon.map(m => `- ${m.name}: ${m.stock} units, expires ${new Date(m.expiryDate).toLocaleDateString()}`).join('\n') || 'None'}`;

    const systemPrompt = `You are an expert pharmacy inventory manager. Analyze data and provide practical reorder suggestions. Respond ONLY with valid JSON.`;

    const prompt = `Based on this pharmacy inventory data:
${contextData}

Provide smart reorder suggestions. Respond with ONLY this JSON:
{
  "urgent": [
    {
      "medicineName": "name",
      "reason": "why urgent",
      "suggestedQty": number,
      "priority": "high" | "medium" | "low",
      "estimatedCost": "Rs. X - Y range"
    }
  ],
  "insights": [
    "insight 1",
    "insight 2",
    "insight 3"
  ],
  "totalEstimatedReorderCost": "Rs. X - Y",
  "summary": "2-3 sentence overall assessment"
}`;

    const raw = await callAI(modelKey, [{ role: 'user', content: prompt }], systemPrompt);

    let suggestions;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      suggestions = JSON.parse(clean);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      suggestions = match ? JSON.parse(match[0]) : { urgent: [], insights: [], summary: 'Could not generate suggestions.' };
    }

    res.json({
      success: true,
      suggestions,
      dataUsed: {
        lowStockCount:    lowStockMeds.length,
        topSellersCount:  topSellers.length,
        expiringSoonCount:expiringSoon.length,
      },
    });
  } catch (err) {
    console.error('[AI Reorder]', err.message);
    res.status(500).json({ success: false, message: `AI error: ${err.message}` });
  }
};