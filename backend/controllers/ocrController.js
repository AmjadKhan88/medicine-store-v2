const { GoogleGenerativeAI } = require('@google/generative-ai');
const Medicine = require('../models/Medicine');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.scanPrescription = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Image file required' });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a medical prescription parser for a Pakistani pharmacy management system.
Analyze this prescription image and extract ALL medicine details.

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "doctorName": "string or null",
  "patientName": "string or null",
  "date": "YYYY-MM-DD or null",
  "diagnosis": "string or null",
  "medicines": [
    {
      "name": "medicine name as written",
      "dosage": "dose like 500mg, 1 tablet, etc",
      "frequency": "Once daily / Twice daily / Three times daily / etc",
      "duration": "3 days / 1 week / etc",
      "route": "Oral / IV / etc",
      "notes": "any special instructions",
      "quantity": null
    }
  ],
  "instructions": "general patient instructions if any",
  "confidence": "high|medium|low"
}

If you cannot read the prescription clearly, still extract whatever you can.
For Pakistani prescriptions: common prefixes like Tab, Cap, Inj, Syr, Susp, Drops are medicine types.`;

    const imageData = {
      inlineData: {
        data:     req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype,
      },
    };

    const result   = await model.generateContent([prompt, imageData]);
    const text     = result.response.text().trim();

    // Clean JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ success: false, message: 'Could not parse prescription response' });

    const parsed = JSON.parse(jsonMatch[0]);

    // Try to match medicines to inventory
    if (parsed.medicines?.length > 0) {
      for (const med of parsed.medicines) {
        // Fuzzy match against inventory
        const matches = await Medicine.find({
          storeId: req.storeId,
          isActive: true,
          $or: [
            { name:        { $regex: med.name.split(' ')[0], $options: 'i' } },
            { genericName: { $regex: med.name.split(' ')[0], $options: 'i' } },
          ],
        }).select('name genericName stock salePrice unit').limit(3).lean();

        med.inventoryMatches = matches;
        med.foundInInventory = matches.length > 0;
      }
    }

    res.json({ success: true, prescription: parsed, rawText: text });
  } catch (err) {
    if (err.message?.includes('API_KEY')) {
      return res.status(500).json({ success: false, message: 'Gemini API key not configured' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};