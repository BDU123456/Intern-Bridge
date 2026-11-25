import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import authMiddleware from '../middlewares/authMiddleware.js';

const secret = 'middleware-test-secret';
process.env.JWT_SECRET = secret;

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test('rejects requests without a bearer token', () => {
  const req = { header: () => undefined };
  const res = createResponse();
  let nextCalled = false;

  authMiddleware(['student'])(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('accepts a valid token with an allowed role', () => {
  const token = jwt.sign({ id: 7, role: 'student' }, secret);
  const req = { header: () => `Bearer ${token}` };
  const res = createResponse();
  let nextCalled = false;

  authMiddleware(['student'])(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.user.id, 7);
});

test('rejects a valid token with a disallowed role', () => {
  const token = jwt.sign({ id: 7, role: 'company' }, secret);
  const req = { header: () => `Bearer ${token}` };
  const res = createResponse();

  authMiddleware(['student'])(req, res, () => {});

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Unauthorized role');
});

test('rejects an invalid token', () => {
  const req = { header: () => 'Bearer invalid-token' };
  const res = createResponse();

  authMiddleware(['student'])(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, 'Token is not valid');
});
