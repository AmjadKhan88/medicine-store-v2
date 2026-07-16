const cron = require('node-cron');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const emailService = require('../utils/emailService');
const BloodUnit = require('../models/BloodUnit');


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

      const now = new Date();
      const in30Days = new Date(); in30Days.setDate(in30Days.getDate() + 30);

      for (const admin of admins) {
        try {
          const storeId = admin.storeId || admin._id;

          const in7Days = new Date(); in7Days.setDate(in7Days.getDate() + 7);

          const [expired, expiringSoon, lowStock,
            bloodExpired, bloodExpiringSoon] = await Promise.all([
              Medicine.find({ storeId, isActive: true, expiryDate: { $lt: now } })
                .select('name stock unit expiryDate').lean(),
              Medicine.find({ storeId, isActive: true, expiryDate: { $gte: now, $lte: in30Days } })
                .select('name stock unit expiryDate').lean(),
              Medicine.find({ storeId, isActive: true, $expr: { $lte: ['$stock', '$minStock'] } })
                .select('name stock unit minStock').lean(),
              // Blood units expired
              BloodUnit.find({ storeId, status: 'Available', expiryDate: { $lt: now } })
                .select('bagId bloodGroup component expiryDate').lean(),
              // Blood units expiring in 7 days
              BloodUnit.find({ storeId, status: 'Available', expiryDate: { $gte: now, $lte: in7Days } })
                .select('bagId bloodGroup component expiryDate').lean(),
            ]);

          // Auto-mark expired blood units
          if (bloodExpired.length > 0) {
            await BloodUnit.updateMany(
              { storeId, status: 'Available', expiryDate: { $lt: now } },
              { $set: { status: 'Expired' } }
            );
          }

          // Only send if there's something to report
          if (expired.length + expiringSoon.length + lowStock.length === 0) {
            console.log(`[Cron] No issues for ${admin.email} — skipping`);
            continue;
          }

          // Get store name from localStorage isn't possible server-side,
          // so we use what's in the user record or fallback
          const storeName = admin.storeName || 'Your Pharmacy';

          await emailService.sendExpiryDigestEmail({
            email: admin.email,
            adminName: admin.name,
            storeName,
            expired,
            expiringSoon,
            lowStock,
          });

          try {
            const { sendExpiryPush } = require('../controllers/pushController');
            await sendExpiryPush(storeId, {
              expiredCount: expired.length,
              expiringSoonCount: expiringSoon.length,
              lowStockCount: lowStock.length,
            });
          } catch (pushErr) {
            console.error(`[Cron] Push failed for ${admin.email}:`, pushErr.message);
          }

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