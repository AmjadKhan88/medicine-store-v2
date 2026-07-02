const superAdmin = (req, res, next) => {
  const email = process.env.SUPER_ADMIN_EMAIL;
  if (!email)
    return res.status(500).json({ success: false, message: 'Super admin not configured in .env' });
  if (req.user?.email !== email)
    return res.status(403).json({ success: false, message: 'Super admin access required' });
  next();
};

module.exports = superAdmin;