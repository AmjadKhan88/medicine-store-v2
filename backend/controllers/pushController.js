const webpush          = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const Medicine         = require('../models/Medicine');
const Subscription     = require('../models/Subscription');
const User             = require('../models/User');

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_EMAIL       || 'mailto:admin@medistore.pk',
  process.env.VAPID_PUBLIC_KEY  || '',
  process.env.VAPID_PRIVATE_KEY || '',
);

/* ── Return public VAPID key to frontend ── */
exports.getVapidKey = (req, res) => {
  res.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY || '' });
};

/* ── Save push subscription ── */
exports.subscribe = async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint)
      return res.status(400).json({ success: false, message: 'Invalid subscription' });

    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        storeId:   req.storeId,
        userId:    req.user._id,
        endpoint:  subscription.endpoint,
        keys:      subscription.keys,
        userAgent: req.headers['user-agent'],
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Remove push subscription ── */
exports.unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    await PushSubscription.deleteOne({ endpoint, storeId: req.storeId });
    res.json({ success: true, message: 'Unsubscribed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Core: send push to all subscriptions in a store ── */
async function sendPushToStore(storeId, payload) {
  const subs = await PushSubscription.find({ storeId });
  if (!subs.length) return;

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify(payload)
      ).catch(async (err) => {
        // 410 Gone = subscription expired — remove it
        if (err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
        throw err;
      })
    )
  );

  const sent   = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  console.log(`[Push] Store ${storeId}: ${sent} sent, ${failed} failed`);
}

/* ── Manual test notification ── */
exports.sendTest = async (req, res) => {
  try {
    await sendPushToStore(req.storeId, {
      title: '✅ MediStore Notifications Work!',
      body:  'You will receive alerts for expiry, low stock and more.',
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      tag:   'test',
      url:   '/app',
    });
    res.json({ success: true, message: 'Test notification sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Called by the weekly cron job ── */
exports.sendExpiryPush = async (storeId, { expiredCount, expiringSoonCount, lowStockCount }) => {
  const total = expiredCount + expiringSoonCount + lowStockCount;
  if (total === 0) return;

  const parts = [];
  if (expiredCount    > 0) parts.push(`${expiredCount} expired`);
  if (expiringSoonCount > 0) parts.push(`${expiringSoonCount} expiring soon`);
  if (lowStockCount   > 0) parts.push(`${lowStockCount} low stock`);

  await sendPushToStore(storeId, {
    title:  expiredCount > 0 ? '🚨 Urgent: Expired Medicines!' : '⚠️ Pharmacy Alert',
    body:   parts.join(' · '),
    icon:   '/icons/icon-192.png',
    badge:  '/icons/icon-96.png',
    tag:    'expiry-alert',
    url:    '/app/expiry-alerts',
    requireInteraction: expiredCount > 0,
    actions: [
      { action: 'view',    title: 'View Alerts' },
      { action: 'dismiss', title: 'Dismiss'     },
    ],
  });
};

exports.sendPushToStore = sendPushToStore;