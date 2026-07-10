const { ZodError } = require('zod');

const formatZodErrors = (err) => {
  const issues = err.issues || err.errors || [];
  if (!Array.isArray(issues) || issues.length === 0) {
    return { body: err?.message || 'Validation failed' };
  }
  // Build an object: { fieldName: message, ... }
  const errorsObj = {};
  issues.forEach(e => {
    const field = e.path.join('.') || 'body';
    // Only set the first message for each field (avoid duplicates)
    if (!errorsObj[field]) {
      errorsObj[field] = e.message;
    }
  });
  return errorsObj;
};

const validate = (schema) => (req, res, next) => {
  const body = req.body ?? {};

  const result = schema.safeParse(body);

  if (!result.success) {
    const errors = formatZodErrors(result.error);
    // Extract first message for the top-level summary
    const firstField = Object.keys(errors)[0];
    const firstMessage = firstField ? errors[firstField] : 'Validation failed';
    
    return res.status(400).json({
      success: false,
      message: firstMessage,
      errors,  // now an object
    });
  }

  req.body = result.data;
  next();
};

// Same change for validateQuery
const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query ?? {});
  if (!result.success) {
    const errors = formatZodErrors(result.error);
    const firstField = Object.keys(errors)[0];
    const firstMessage = firstField ? errors[firstField] : 'Validation failed';
    return res.status(400).json({
      success: false,
      message: firstMessage,
      errors,
    });
  }
  req.query = result.data;
  next();
};

module.exports = { validate, validateQuery };