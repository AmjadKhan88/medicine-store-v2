const rateLimit  = require('express-rate-limit');
const slowDown   = require('express-slow-down');

/* ── General API limiter: 100 req/min per IP ── */
exports.apiLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests — please slow down.' },
  skip: (req) => req.path === '/api/health', // don't limit health checks
});

/* ── Auth limiter: 10 attempts per 15 min ── */
exports.authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});

/* ── AI limiter: expensive endpoint ── */
exports.aiLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             10,   // 10 AI requests per minute per IP
  message: { success: false, message: 'AI rate limit reached. Wait 1 minute.' },
});

/* ── Slow down before hard block ── */
exports.speedLimiter = slowDown({
  windowMs:         60 * 1000,
  delayAfter:       50,    // start slowing after 50 req/min
  delayMs:          (used) => (used - 50) * 100, // +100ms per extra request
  maxDelayMs:       5000,
});