/**
 * Every model needs a `storeId` field.
 * This middleware sets req.storeId so controllers
 * always filter by it — tenants are fully isolated.
 */
const tenantFilter = (req, res, next) => {
  if (!req.user) return next();
  // storeId is always set in protect middleware
  req.storeId = req.user.storeId;
  next();
};

module.exports = { tenantFilter };