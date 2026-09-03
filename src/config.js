import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const REQUIRED_ENV = [
  'OKTA_DOMAIN',
  'OKTA_CLIENT_ID',
  'OKTA_KID',
  'OKTA_PRIVATE_KEY',
  'SCIM_USERNAME',
  'SCIM_PASSWORD'
];

export function normalizePrivateKey(value) {
  return value.replace(/\\n/g, '\n');
}

export function buildConfig(env = process.env) {
  const missing = REQUIRED_ENV.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing mandatory environment variables: ${missing.join(', ')}`);
  }

  const oktaDomain = env.OKTA_DOMAIN.replace(/^https?:\/\//i, '').replace(/\/+$/g, '');
  const tokenEndpoint = `https://${oktaDomain}/oauth2/v1/token`;

  return {
    okta: {
      domain: oktaDomain,
      baseUrl: `https://${oktaDomain}`,
      tokenEndpoint,
      clientId: env.OKTA_CLIENT_ID,
      kid: env.OKTA_KID,
      privateKey: normalizePrivateKey(env.OKTA_PRIVATE_KEY),
      scopes: ['okta.users.read', 'okta.groups.read'],
      requestTimeoutMs: 15000
    },
    scim: {
      username: env.SCIM_USERNAME,
      password: env.SCIM_PASSWORD
    },
    port: Number(env.PORT || 3000)
  };
}
