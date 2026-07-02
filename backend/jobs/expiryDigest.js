const cron         = require('node-cron');
const User         = require('../models/User');
const Medicine     = require('../models/Medicine');
const emailService = require('../utils/emailService');

/**
 * Runs every Monday at 8:00 AM Pakistan time (UTC+5 = 03:00 UTC)
 * Sends expiry + low stock digest to every store admin
 */
function startExpiryDigestJob() {
  cron.schedule('0 3 * * 1', async () => {
    console.log('[Cron] Running weekly expiry digest...');

    try {
      // Get all admin users (one per store)
      const admins = await User.find({ role: 'admin', isActive: true });
      console.log(`[Cron] Found ${admins.length} stores to notify`);

      const now       = new Date();
      const in30Days  = new Date(); in30Days.setDate(in30Days.getDate() + 30);

      for (const admin of admins) {
        try {
          const storeId = admin.storeId || admin._id;

          const [expired, expiringSoon, lowStock] = await Promise.all([
            Medicine.find({ storeId, isActive: true, expiryDate: { $lt: now } })
              .select('name stock unit expiryDate').lean(),
            Medicine.find({ storeId, isActive: true, expiryDate: { $gte: now, $lte: in30Days } })
              .select('name stock unit expiryDate').lean(),
            Medicine.find({ storeId, isActive: true, $expr: { $lte: ['$stock', '$minStock'] } })
              .select('name stock unit minStock').lean(),
          ]);

          // Only send if there's something to report
          if (expired.length + expiringSoon.length + lowStock.length === 0) {
            console.log(`[Cron] No issues for ${admin.email} — skipping`);
            continue;
          }

          // Get store name from localStorage isn't possible server-side,
          // so we use what's in the user record or fallback
          const storeName = admin.storeName || 'Your Pharmacy';

          await emailService.sendExpiryDigestEmail({
            email:       admin.email,
            adminName:   admin.name,
            storeName,
            expired,
            expiringSoon,
            lowStock,
          });

          console.log(`[Cron] Digest sent to ${admin.email} — ${expired.length} expired, ${expiringSoon.length} expiring, ${lowStock.length} low stock`);
        } catch (err) {
          console.error(`[Cron] Failed for ${admin.email}:`, err.message);
        }
      }

      console.log('[Cron] Weekly digest complete');
    } catch (err) {
      console.error('[Cron] Digest job failed:', err.message);
    }
  }, {
    timezone: 'Asia/Karachi',
  });

  console.log('✅ Weekly expiry digest cron job scheduled (Monday 8:00 AM PKT)');
}

module.exports = { startExpiryDigestJob };