import { timingSafeEqual } from 'node:crypto';
import { sendScimError } from '../scim/response.js';

function safeCompare(actual, expected) {
  const actualBuffer = Buffer.from(actual || '', 'utf8');
  const expectedBuffer = Buffer.from(expected || '', 'utf8');
  const maxLength = Math.max(actualBuffer.length, expectedBuffer.length);
  const actualPadded = Buffer.alloc(maxLength);
  const expectedPadded = Buffer.alloc(maxLength);

  actualBuffer.copy(actualPadded);
  expectedBuffer.copy(expectedPadded);

  return timingSafeEqual(actualPadded, expectedPadded) && actualBuffer.length === expectedBuffer.length;
}

export function basicAuth({ username, password }) {
  return function requireBasicAuth(req, res, next) {
    const header = req.get('authorization') || '';

    if (!header.toLowerCase().startsWith('basic ')) {
      return unauthorized(res);
    }

    let decoded;
    try {
      decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    } catch {
      return unauthorized(res);
    }

    const separator = decoded.indexOf(':');
    if (separator < 0) {
      return unauthorized(res);
    }

    const suppliedUsername = decoded.slice(0, separator);
    const suppliedPassword = decoded.slice(separator + 1);

    if (!safeCompare(suppliedUsername, username) || !safeCompare(suppliedPassword, password)) {
      return unauthorized(res);
    }

    return next();
  };
}

function unauthorized(res) {
  res.set('WWW-Authenticate', 'Basic realm="SCIM", charset="UTF-8"');
  return sendScimError(res, 401, 'Unauthorized');
}
