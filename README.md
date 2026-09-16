# okta-cis-scim-adapter

Production-ready Node.js 20+ SCIM 2.0 source adapter for SAP Cloud Identity Services Identity Provisioning. SAP IPS pulls users and groups from this service over SCIM, and the adapter reads authoritative data from Okta Management APIs.

## Architecture

```text
SAP CIS / IPS
  -> HTTP Basic Auth + SCIM 2.0
Node.js SCIM Adapter on SAP BTP Cloud Foundry
  -> OAuth 2.0 Client Credentials with private_key_jwt
Okta Management APIs
  -> /api/v1/users and /api/v1/groups
```

IPS does not receive Okta OAuth credentials. The adapter is responsible for authenticating to Okta.

## Prerequisites

- Node.js 20 or newer
- npm
- An Okta service application configured for OAuth 2.0 Client Credentials
- An RSA private key whose public key is registered with the Okta service application
- SAP BTP Cloud Foundry CLI access for deployment

## Okta Setup

Create or use an Okta API service application that supports private key JWT authentication. Register the public key with the application and keep the private key outside source control.

Grant the application these Okta API scopes:

- `okta.users.read`
- `okta.groups.read`

The adapter uses:

- Token endpoint: `https://${OKTA_DOMAIN}/oauth2/v1/token`
- Grant type: `client_credentials`
- Client authentication: `private_key_jwt`
- JWT signing algorithm: `RS256`

Do not configure or use `client_secret` authentication for this integration.

## Environment Variables

Copy `.env.example` to `.env` for local development and fill in placeholder values:

```env
OKTA_DOMAIN=integrator-3028619.okta.com
OKTA_CLIENT_ID=replace-me
OKTA_KID=replace-me
OKTA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

SCIM_USERNAME=ips-reader
SCIM_PASSWORD=replace-with-strong-password

PORT=3000
```

`OKTA_PRIVATE_KEY` may contain literal `\n` characters. The adapter converts them to real newline characters before signing the JWT client assertion.

Never commit `.env`, private keys, passwords, OAuth access tokens, or generated client assertions.

## Local Run

```bash
npm install
npm test
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

Read users:

```bash
curl -u ips-reader:password \
"http://localhost:3000/scim/v2/Users?startIndex=1&count=10"
```

Read groups:

```bash
curl -u ips-reader:password \
"http://localhost:3000/scim/v2/Groups?startIndex=1&count=10"
```

## SCIM Endpoints

- `GET /health`
- `GET /scim/v2/Users`
- `GET /scim/v2/Groups`
- `GET /scim/v2/ServiceProviderConfig`
- `GET /scim/v2/Schemas`
- `GET /scim/v2/ResourceTypes`

`/health` is unauthenticated and does not call Okta. All `/scim/v2/*` endpoints require HTTP Basic Authentication.

Supported query parameters:

- `startIndex`, default `1`, SCIM one-based indexing
- `count`, default `100`
- Users filter: `userName eq "value"`
- Groups filter: `displayName eq "value"`

Unsupported filters return a SCIM 400 error response.

## BTP Cloud Foundry Deployment

Set secrets with Cloud Foundry environment variables, not in `manifest.yml`:

```bash
cf push --no-start
cf set-env okta-cis-scim-adapter OKTA_DOMAIN test-tenant.okta.com
cf set-env okta-cis-scim-adapter OKTA_CLIENT_ID replace-me
cf set-env okta-cis-scim-adapter OKTA_KID replace-me
cf set-env okta-cis-scim-adapter OKTA_PRIVATE_KEY "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
cf set-env okta-cis-scim-adapter SCIM_USERNAME ips-reader
cf set-env okta-cis-scim-adapter SCIM_PASSWORD replace-with-strong-password
cf start okta-cis-scim-adapter
```

For updates after env vars are already configured:

```bash
cf push
```

The app listens on `process.env.PORT`, which Cloud Foundry provides at runtime.

## SAP CIS Identity Provisioning Configuration

Create a source system in SAP CIS Identity Provisioning:

- System Type: `SCIM System`
- Type: `HTTP`
- ProxyType: `Internet`
- URL: `https://<btp-route>/scim/v2`
- Authentication: `BasicAuthentication`
- User: value of `SCIM_USERNAME`
- Password: value of `SCIM_PASSWORD`

Do not configure Okta OAuth credentials in SAP IPS.

## Security Considerations

- Secrets are read only from environment variables.
- Startup fails if required configuration is missing.
- The app does not log private keys, access tokens, client assertions, SCIM passwords, or Authorization headers.
- Okta API calls use finite HTTP timeouts.
- Okta access tokens are cached only in memory and refreshed before expiry.
- Concurrent token requests share one in-flight token request.
- SCIM errors are sanitized and do not expose stack traces or secrets.
- `.gitignore` excludes `.env`, `*.pem`, `*.key`, and `node_modules/`.

## Known POC Limitations

- Read-only integration.
- No SCIM `POST`, `PATCH`, or `DELETE`.
- Group membership is not included in v1.
- Limited SCIM filter support.
- No delta provisioning yet.
- Okta data is authoritative.
- Adapter is stateless except for in-memory OAuth token caching.
