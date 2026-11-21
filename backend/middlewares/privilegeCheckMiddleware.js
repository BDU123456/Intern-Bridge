import User from '../models/User.js';

const privilegeCheckMiddleware = (options = {}) => {
  const safeOptions = options && typeof options === 'object' && !Array.isArray(options)
    ? options
    : {};
  const {
    requiredPrivileges,
    requireAll = false, 
    allowAdmins = true 
  } = safeOptions;
  const hasValidRequiredPrivileges = Array.isArray(requiredPrivileges) &&
    requiredPrivileges.length > 0 &&
    requiredPrivileges.every(privilege => typeof privilege === 'string' && privilege.trim());
  
  return async (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    // Fail closed if a route forgot to declare its required privileges.
    if (!hasValidRequiredPrivileges) {
      return res.status(403).json({
        success: false,
        message: 'Route privilege configuration is missing or invalid'
      });
    }
    
    // If user is admin and admins are allowed, skip privilege check
    if (allowAdmins && req.user.role === 'admin') {
      return next();
    }
    
    try {
      let hasPrivilege = false;
      
      if (requireAll) {
        // User must have ALL required privileges
        hasPrivilege = true;
        for (const privilege of requiredPrivileges) {
          if (!(await User.hasPrivilege(req.user.id, privilege))) {
            hasPrivilege = false;
            break;
          }
        }
      } else {
        // User must have ANY of the required privileges
        for (const privilege of requiredPrivileges) {
          if (await User.hasPrivilege(req.user.id, privilege)) {
            hasPrivilege = true;
            break;
          }
        }
      }
      
      if (!hasPrivilege) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient privileges'
        });
      }
      
      next();
    } catch (error) {
      console.error('Privilege Check Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during privilege check'
      });
    }
  };
};

export default privilegeCheckMiddleware;
