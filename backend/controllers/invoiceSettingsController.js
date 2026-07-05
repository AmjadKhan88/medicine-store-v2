const InvoiceSettings = require('../models/InvoiceSettings');
const cloudinaryUtil  = require('../utils/cloudinary');

/* ── Get settings (auto-create defaults if missing) ── */
exports.getSettings = async (req, res) => {
  try {
    let settings = await InvoiceSettings.findOne({ storeId: req.storeId });
    if (!settings) {
      settings = await InvoiceSettings.create({ storeId: req.storeId });
    }
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Update settings ── */
exports.updateSettings = async (req, res) => {
  try {
    const allowed = [
      'template','accentColor','darkColor','fontStyle',
      'showLogo','showStoreName','showDoctorName','showAddress',
      'showPhone','showLicenseNumber','showEmail',
      'showPatientId','showPatientAge','showGenericName',
      'showDiscount','showTax','showSavings',
      'footerText','showFooterNote','showPoweredBy',
      'thermalFontSize','thermalLineSpacing',
    ];

    const update = {};
    allowed.forEach(key => { if (req.body[key] !== undefined) update[key] = req.body[key]; });

    const settings = await InvoiceSettings.findOneAndUpdate(
      { storeId: req.storeId },
      update,
      { new: true, upsert: true }
    );
    res.json({ success: true, settings, message: 'Invoice settings saved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Upload store logo ── */
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'No file uploaded' });

    let settings = await InvoiceSettings.findOne({ storeId: req.storeId });
    if (!settings) settings = await InvoiceSettings.create({ storeId: req.storeId });

    // Delete old logo from Cloudinary
    if (settings.logo?.publicId) {
      await cloudinaryUtil.deleteFile(settings.logo.publicId, 'image/png').catch(() => {});
    }

    const result = await cloudinaryUtil.uploadBuffer(
      req.file.buffer,
      req.file.mimetype,
      `medistore/${req.storeId}/logos`,
      `logo_${Date.now()}`
    );

    settings.logo = { url: result.secure_url, publicId: result.public_id };
    await settings.save();

    res.json({ success: true, settings, message: 'Logo uploaded' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Remove logo ── */
exports.removeLogo = async (req, res) => {
  try {
    const settings = await InvoiceSettings.findOne({ storeId: req.storeId });
    if (settings?.logo?.publicId) {
      await cloudinaryUtil.deleteFile(settings.logo.publicId, 'image/png').catch(() => {});
    }
    await InvoiceSettings.findOneAndUpdate(
      { storeId: req.storeId },
      { $unset: { logo: 1 } }
    );
    res.json({ success: true, message: 'Logo removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};