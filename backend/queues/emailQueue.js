const Bull = require('bull');
const emailService = require('../utils/emailService');

const emailQueue = new Bull('email', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
  defaultJobOptions: {
    attempts:   3,             // retry 3 times on failure
    backoff: {
      type:  'exponential',
      delay: 2000,             // 2s, 4s, 8s
    },
    removeOnComplete: 100,     // keep last 100 completed jobs
    removeOnFail:     50,
  },
});

/* ── Process emails in background ── */
emailQueue.process('invoice',      5, async (job) => {
  await emailService.sendInvoiceEmail(job.data);
});

emailQueue.process('verification', 3, async (job) => {
  await emailService.sendVerificationEmail(job.data);
});

emailQueue.process('reset',        3, async (job) => {
  await emailService.sendPasswordResetEmail(job.data);
});

emailQueue.process('invitation',   3, async (job) => {
  await emailService.sendStaffInvitationEmail(job.data);
});

emailQueue.process('digest',       2, async (job) => {
  await emailService.sendExpiryDigestEmail(job.data);
});

/* ── Queue events ── */
emailQueue.on('failed', (job, err) => {
  console.error(`[Email Queue] Job ${job.id} failed:`, err.message);
});

emailQueue.on('stalled', (job) => {
  console.warn(`[Email Queue] Job ${job.id} stalled`);
});

/* ── Helper: add email to queue instead of sending directly ── */
exports.queueEmail = (type, data, options = {}) => {
  return emailQueue.add(type, data, options);
};

exports.emailQueue = emailQueue;