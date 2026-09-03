import assert from 'node:assert/strict';
import test from 'node:test';
import { listResponse, parsePagination } from '../src/scim/response.js';

test('generates SCIM ListResponse', () => {
  const response = listResponse([{ id: '1' }, { id: '2' }], 1, 100);

  assert.deepEqual(response, {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: 2,
    startIndex: 1,
    itemsPerPage: 2,
    Resources: [{ id: '1' }, { id: '2' }]
  });
});

test('applies one-based startIndex/count pagination', () => {
  const response = listResponse([{ id: '1' }, { id: '2' }, { id: '3' }], 2, 1);

  assert.equal(response.totalResults, 3);
  assert.equal(response.startIndex, 2);
  assert.equal(response.itemsPerPage, 1);
  assert.deepEqual(response.Resources, [{ id: '2' }]);
});

test('rejects invalid pagination parameters', () => {
  assert.throws(() => parsePagination({ startIndex: '0' }), /startIndex/);
  assert.throws(() => parsePagination({ count: '-1' }), /count/);
});
