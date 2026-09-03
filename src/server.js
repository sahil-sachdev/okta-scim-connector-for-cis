import express from 'express';
import { fileURLToPath } from 'node:url';
import { buildConfig } from './config.js';
import { basicAuth } from './middleware/basicAuth.js';
import { OktaAuthClient } from './okta/auth.js';
import { OktaClient, sanitizeOktaError } from './okta/client.js';
import { getUsers } from './okta/users.js';
import { getGroups } from './okta/groups.js';
import { applyUserFilter, mapOktaUserToScim } from './scim/userMapper.js';
import { applyGroupFilter, mapOktaGroupToScim } from './scim/groupMapper.js';
import { listResponse, parsePagination, scimError, sendScimError } from './scim/response.js';

export function createApp({ appConfig = buildConfig(), oktaServices } = {}) {
  const app = express();
  const services = oktaServices || createOktaServices(appConfig);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'UP',
      service: 'okta-cis-scim-adapter'
    });
  });

  app.use('/scim/v2', basicAuth(appConfig.scim));

  app.get('/scim/v2/Users', async (req, res, next) => {
    try {
      const { startIndex, count } = parsePagination(req.query);
      const oktaUsers = await services.getUsers();
      const scimUsers = oktaUsers.map(mapOktaUserToScim);
      const filteredUsers = applyUserFilter(scimUsers, req.query.filter);

      if (!filteredUsers) {
        throw scimError(400, 'Unsupported filter. Supported user filter: userName eq "value"', 'invalidFilter');
      }

      res.json(listResponse(filteredUsers, startIndex, count));
    } catch (error) {
      next(withUpstreamContext(error, 'Unable to retrieve users from upstream identity provider'));
    }
  });

  app.get('/scim/v2/Groups', async (req, res, next) => {
    try {
      const { startIndex, count } = parsePagination(req.query);
      const oktaGroups = await services.getGroups();
      const scimGroups = oktaGroups.map(mapOktaGroupToScim);
      const filteredGroups = applyGroupFilter(scimGroups, req.query.filter);

      if (!filteredGroups) {
        throw scimError(400, 'Unsupported filter. Supported group filter: displayName eq "value"', 'invalidFilter');
      }

      res.json(listResponse(filteredGroups, startIndex, count));
    } catch (error) {
      next(withUpstreamContext(error, 'Unable to retrieve groups from upstream identity provider'));
    }
  });

  app.get('/scim/v2/ServiceProviderConfig', (_req, res) => {
    res.json({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
      patch: { supported: false },
      bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter: { supported: true, maxResults: 1000 },
      changePassword: { supported: false },
      sort: { supported: false },
      etag: { supported: false },
      authenticationSchemes: [
        {
          type: 'httpbasic',
          name: 'HTTP Basic',
          description: 'HTTP Basic authentication',
          specUri: 'https://datatracker.ietf.org/doc/html/rfc7617',
          primary: true
        }
      ]
    });
  });

  app.get('/scim/v2/Schemas', (_req, res) => {
    res.json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: 2,
      startIndex: 1,
      itemsPerPage: 2,
      Resources: [
        {
          id: 'urn:ietf:params:scim:schemas:core:2.0:User',
          name: 'User',
          schema: 'urn:ietf:params:scim:schemas:core:2.0:Schema',
          attributes: [
            { name: 'userName', type: 'string', multiValued: false, required: true },
            { name: 'active', type: 'boolean', multiValued: false, required: false },
            { name: 'name', type: 'complex', multiValued: false, required: false },
            { name: 'emails', type: 'complex', multiValued: true, required: false }
          ]
        },
        {
          id: 'urn:ietf:params:scim:schemas:core:2.0:Group',
          name: 'Group',
          schema: 'urn:ietf:params:scim:schemas:core:2.0:Schema',
          attributes: [
            { name: 'displayName', type: 'string', multiValued: false, required: true },
            { name: 'members', type: 'complex', multiValued: true, required: false }
          ]
        }
      ]
    });
  });

  app.get('/scim/v2/ResourceTypes', (_req, res) => {
    res.json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: 2,
      startIndex: 1,
      itemsPerPage: 2,
      Resources: [
        {
          id: 'User',
          name: 'User',
          endpoint: '/Users',
          schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
          schemaExtensions: []
        },
        {
          id: 'Group',
          name: 'Group',
          endpoint: '/Groups',
          schema: 'urn:ietf:params:scim:schemas:core:2.0:Group',
          schemaExtensions: []
        }
      ]
    });
  });

  app.use('/scim/v2', (_req, res) => {
    sendScimError(res, 404, 'SCIM endpoint not found');
  });

  app.use((error, _req, res, _next) => {
    console.error('Request failed:', sanitizeForLog(error));

    if (error.scim) {
      return res.status(error.status || 500).json(error.scim);
    }

    const status = error.response?.status || error.status || 500;
    const detail = status >= 500 ? 'Internal server error' : error.message;
    return sendScimError(res, status, detail);
  });

  return app;
}

function createOktaServices(appConfig) {
  const authClient = new OktaAuthClient(appConfig.okta);
  const oktaClient = new OktaClient(appConfig.okta, authClient);

  return {
    getUsers: () => getUsers(oktaClient),
    getGroups: () => getGroups(oktaClient)
  };
}

function withUpstreamContext(error, detail) {
  if (error.scim) {
    return error;
  }

  if (error.response) {
    const wrapped = scimError(error.response.status || 500, error.response.status === 429 ? sanitizeOktaError(error) : detail);
    wrapped.response = error.response;
    return wrapped;
  }

  return scimError(500, detail);
}

function sanitizeForLog(error) {
  return {
    message: error.message,
    status: error.response?.status,
    code: error.code
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const config = buildConfig();
  const app = createApp({ appConfig: config });
  app.listen(config.port, () => {
    console.log(`okta-cis-scim-adapter listening on port ${config.port}`);
  });
}
