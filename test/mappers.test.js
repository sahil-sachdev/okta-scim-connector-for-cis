import assert from 'node:assert/strict';
import test from 'node:test';
import { mapOktaUserToScim } from '../src/scim/userMapper.js';
import { mapOktaGroupToScim } from '../src/scim/groupMapper.js';

test('maps Okta user to SCIM user', () => {
  const scimUser = mapOktaUserToScim({
    id: '00u123',
    status: 'ACTIVE',
    profile: {
      login: 'john.smith@example.com',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com'
    }
  });

  assert.deepEqual(scimUser, {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: '00u123',
    externalId: '00u123',
    userName: 'john.smith@example.com',
    active: true,
    name: {
      givenName: 'John',
      familyName: 'Smith'
    },
    emails: [
      {
        value: 'john.smith@example.com',
        primary: true
      }
    ]
  });
});

test('maps Okta group to SCIM group', () => {
  const scimGroup = mapOktaGroupToScim({
    id: '00g123',
    profile: {
      name: 'Engineering'
    }
  });

  assert.deepEqual(scimGroup, {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
    id: '00g123',
    externalId: '00g123',
    displayName: 'Engineering'
  });
});
