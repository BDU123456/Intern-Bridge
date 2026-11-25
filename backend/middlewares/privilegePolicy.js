export const isValidRequiredPrivileges = requiredPrivileges =>
  Array.isArray(requiredPrivileges) &&
  requiredPrivileges.length > 0 &&
  requiredPrivileges.every(privilege => typeof privilege === 'string' && privilege.trim());

export const hasPrivilegeAccess = ({
  role,
  grantedPrivileges = [],
  requiredPrivileges,
  requireAll = false,
  allowAdmins = true
}) => {
  if (!isValidRequiredPrivileges(requiredPrivileges)) {
    return false;
  }

  if (allowAdmins && role === 'admin') {
    return true;
  }

  const granted = new Set(grantedPrivileges);
  return requireAll
    ? requiredPrivileges.every(privilege => granted.has(privilege))
    : requiredPrivileges.some(privilege => granted.has(privilege));
};
