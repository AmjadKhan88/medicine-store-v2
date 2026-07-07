const { ZodError } = require('zod');

/**
 * Validate req.body against a Zod schema.
 * Usage: router.post('/', validate(schema), controller)
 */
const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);   // parse + strip unknown fields
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.errors.map(e => ({
        field:   e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({
        success: false,
        message: errors[0].message,   // first error as main message
        errors,
      });
    }
    next(err);
  }
};

/**
 * Validate req.query against a Zod schema.
 */
const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: err.errors[0].message,
        errors:  err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(err);
  }
};

module.exports = { validate, validateQuery };