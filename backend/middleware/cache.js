const { getRedis } = require('../config/redis');

/**
 * Cache GET responses in Redis.
 * Usage: router.get('/dashboard', cache(60), ctrl.getDashboard)
 * @param {number} seconds TTL
 */
const cache = (seconds = 60) => async (req, res, next) => {
  // Only cache GET requests for authenticated users
  if (req.method !== 'GET' || !req.storeId) return next();

  const redis = getRedis();
  if (!redis) return next(); // Redis not available — skip cache

  const key = `cache:${req.storeId}:${req.originalUrl}`;

  try {
    const cached = await redis.get(key);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(JSON.parse(cached));
    }

    // Intercept res.json to save to cache
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      res.setHeader('X-Cache', 'MISS');
      // Only cache successful responses
      if (res.statusCode === 200) {
        redis.setEx(key, seconds, JSON.stringify(data)).catch(() => {});
      }
      return originalJson(data);
    };

    next();
  } catch {
    next(); // Cache error — just serve normally
  }
};

/* ── Invalidate cache for a store (call after writes) ── */
const invalidateStore = async (storeId, pattern = '*') => {
  const redis = getRedis();
  if (!redis) return;
  try {
    const keys = await redis.keys(`cache:${storeId}:${pattern}`);
    if (keys.length > 0) await redis.del(keys);
  } catch {}
};

module.exports = { cache, invalidateStore };