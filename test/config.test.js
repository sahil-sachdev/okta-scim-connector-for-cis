import assert from 'node:assert/strict';
import test from 'node:test';
import { buildConfig, normalizePrivateKey } from '../src/config.js';

test('private key string converts escaped newlines into newlines', () => {
  assert.equal(
    normalizePrivateKey('-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----'),
    '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----'
  );
});

test('buildConfig rejects missing mandatory variables', () => {
  assert.throws(() => buildConfig({}), /Missing mandatory environment variables/);
});
