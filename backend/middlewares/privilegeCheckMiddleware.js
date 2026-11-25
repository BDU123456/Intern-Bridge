import User from '../models/User.js';
import { hasPrivilegeAccess, isValidRequiredPrivileges } from './privilegePolicy.js';

const privilegeCheckMiddleware = (options = {}) => {
  const safeOptions = options && typeof options === 'object' && !Array.isArray(options)
    ? options
    : {};
  const {
    requiredPrivileges,
    requireAll = false, 
    allowAdmins = true 
  } = safeOptions;
  
  return async (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    // Fail closed if a route forgot to declare its required privileges.
    if (!isValidRequiredPrivileges(requiredPrivileges)) {
      return res.status(403).json({
        success: false,
        message: 'Route privilege configuration is missing or invalid'
      });
    }
    
    // If user is admin and admins are allowed, skip privilege check
    if (hasPrivilegeAccess({
      role: req.user.role,
      requiredPrivileges,
      requireAll,
      allowAdmins
    })) {
      return next();
    }
    
    try {
      const grantedPrivileges = [];
      for (const privilege of requiredPrivileges) {
        if (await User.hasPrivilege(req.user.id, privilege)) {
          grantedPrivileges.push(privilege);
        }
      }

      const hasPrivilege = hasPrivilegeAccess({
        role: req.user.role,
        grantedPrivileges,
        requiredPrivileges,
        requireAll,
        allowAdmins
      });
      
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
