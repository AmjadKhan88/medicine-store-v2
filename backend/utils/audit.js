const AuditLog = require('../models/AuditLog');

/**
 * Create an audit log entry.
 * @param {Object} opts
 * @param {string}  opts.action       - enum action key
 * @param {string}  opts.category     - Medicine | Billing | Patient | Stock | Purchase | Auth
 * @param {string}  opts.summary      - human-readable one-liner
 * @param {string}  [opts.entityType] - Medicine | Bill | Patient | PurchaseOrder | User
 * @param {*}       [opts.entityId]
 * @param {string}  [opts.entityName]
 * @param {Object}  [opts.meta]       - any extra data
 * @param {Object}  [opts.user]       - req.user
 * @param {string}  [opts.ip]         - req.ip
 */
async function audit(opts) {
  try {
    await AuditLog.create({
      action:          opts.action,
      category:        opts.category,
      summary:         opts.summary,
      entityType:      opts.entityType,
      entityId:        opts.entityId,
      entityName:      opts.entityName,
      meta:            opts.meta || {},
      performedBy:     opts.user?._id,
      performedByName: opts.user?.name || 'System',
      ip:              opts.ip || '',
    });
  } catch (err) {
    // Never let audit failure break the main request
    console.error('[Audit] Failed to write log:', err.message);
  }
}

module.exports = audit;