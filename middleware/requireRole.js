const requireRole = (...allowedRoles) => {
  const normalizedRoles = allowedRoles.map((role) => String(role).toLowerCase());

  return (req, res, next) => {
    const userRole = String(req.user?.role || '').toLowerCase();

    if (!userRole || !normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }

    next();
  };
};

module.exports = requireRole;
