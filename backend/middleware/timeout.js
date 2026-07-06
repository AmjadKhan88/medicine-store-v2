/**
 * Kill requests that take longer than `ms` milliseconds.
 * Prevents slow DB queries from blocking workers indefinitely.
 */
const timeout = (ms = 30000) => (req, res, next) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        message: 'Request timeout — server is under heavy load. Try again.',
      });
    }
  }, ms);

  res.on('finish',  () => clearTimeout(timer));
  res.on('close',   () => clearTimeout(timer));

  next();
};

module.exports = timeout;