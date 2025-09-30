const adminOnly = (req, res, next) => {
  try {
    if (!req.user || req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Admin access required' });
  }
};

module.exports = adminOnly;
