import assert from 'node:assert/strict';
import test from 'node:test';
import { getNextLink, OktaClient } from '../src/okta/client.js';
import { testConfig } from './helpers.js';

test('parses Okta Link header rel next URL', () => {
  const next = getNextLink('<https://example.okta.com/api/v1/users?after=abc>; rel="next", <https://example.okta.com/api/v1/users>; rel="self"');

  assert.equal(next, 'https://example.okta.com/api/v1/users?after=abc');
});

test('Okta client follows pagination with mocked API calls', async () => {
  const requestedUrls = [];
  const authClient = {
    getAccessToken: async () => 'token'
  };
  const httpClient = {
    get: async (url) => {
      requestedUrls.push(url);

      if (requestedUrls.length === 1) {
        return {
          data: [{ id: '1' }],
          headers: {
            link: '<https://example.okta.com/api/v1/users?after=next>; rel="next"'
          }
        };
      }

      return {
        data: [{ id: '2' }],
        headers: {}
      };
    }
  };

  const client = new OktaClient(testConfig.okta, authClient, httpClient);
  const users = await client.getAll('/api/v1/users');

  assert.deepEqual(users, [{ id: '1' }, { id: '2' }]);
  assert.deepEqual(requestedUrls, [
    'https://example.okta.com/api/v1/users',
    'https://example.okta.com/api/v1/users?after=next'
  ]);
});
