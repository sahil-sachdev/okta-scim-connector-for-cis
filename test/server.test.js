import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/server.js';
import { basic, testConfig, withServer } from './helpers.js';

const oktaServices = {
  getUsers: async () => [
    {
      id: '00u1',
      status: 'ACTIVE',
      profile: {
        login: 'a@example.com',
        firstName: 'A',
        lastName: 'One',
        email: 'a@example.com'
      }
    }
  ],
  getGroups: async () => [
    {
      id: '00g1',
      profile: {
        name: 'Engineering'
      }
    }
  ]
};

test('Basic Auth rejects invalid credentials', async () => {
  const app = createApp({ appConfig: testConfig, oktaServices });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/scim/v2/Users`, {
      headers: { Authorization: basic('ips-reader', 'wrong') }
    });

    assert.equal(response.status, 401);
    assert.match(response.headers.get('www-authenticate'), /^Basic realm="SCIM"/);
  });
});

test('Basic Auth accepts correct credentials', async () => {
  const app = createApp({ appConfig: testConfig, oktaServices });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/scim/v2/Users`, {
      headers: { Authorization: basic() }
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.totalResults, 1);
    assert.equal(body.Resources[0].userName, 'a@example.com');
  });
});

test('unsupported filter produces SCIM 400 response', async () => {
  const app = createApp({ appConfig: testConfig, oktaServices });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/scim/v2/Users?filter=emails.value%20eq%20%22a@example.com%22`, {
      headers: { Authorization: basic() }
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(body.schemas, ['urn:ietf:params:scim:api:messages:2.0:Error']);
    assert.equal(body.scimType, 'invalidFilter');
  });
});

test('supported group filter is applied', async () => {
  const app = createApp({ appConfig: testConfig, oktaServices });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/scim/v2/Groups?filter=displayName%20eq%20%22Engineering%22`, {
      headers: { Authorization: basic() }
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.totalResults, 1);
    assert.equal(body.Resources[0].displayName, 'Engineering');
  });
});
