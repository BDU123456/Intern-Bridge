import assert from 'node:assert/strict';
import test from 'node:test';
import { hasPrivilegeAccess, isValidRequiredPrivileges } from '../middlewares/privilegePolicy.js';

test('requires a non-empty list of privilege names', () => {
  assert.equal(isValidRequiredPrivileges(['manage_students']), true);
  assert.equal(isValidRequiredPrivileges([]), false);
  assert.equal(isValidRequiredPrivileges(['']), false);
});

test('allows admins unless the route opts out', () => {
  const options = { role: 'admin', requiredPrivileges: ['manage_admins'] };
  assert.equal(hasPrivilegeAccess(options), true);
  assert.equal(hasPrivilegeAccess({ ...options, allowAdmins: false }), false);
});

test('checks any required privilege by default', () => {
  assert.equal(hasPrivilegeAccess({
    role: 'privileged_admin',
    grantedPrivileges: ['manage_companies'],
    requiredPrivileges: ['manage_students', 'manage_companies']
  }), true);
});

test('can require every listed privilege', () => {
  const options = {
    role: 'privileged_admin',
    grantedPrivileges: ['manage_students'],
    requiredPrivileges: ['manage_students', 'manage_companies'],
    requireAll: true
  };
  assert.equal(hasPrivilegeAccess(options), false);
  assert.equal(hasPrivilegeAccess({
    ...options,
    grantedPrivileges: ['manage_students', 'manage_companies']
  }), true);
});

test('denies users without a matching privilege', () => {
  assert.equal(hasPrivilegeAccess({
    role: 'privileged_admin',
    grantedPrivileges: [],
    requiredPrivileges: ['manage_students']
  }), false);
});
