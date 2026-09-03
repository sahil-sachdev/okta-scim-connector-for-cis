import http from 'node:http';

export const testConfig = {
  okta: {
    domain: 'example.okta.com',
    baseUrl: 'https://example.okta.com',
    tokenEndpoint: 'https://example.okta.com/oauth2/v1/token',
    clientId: 'client-id',
    kid: 'kid',
    privateKey: 'private-key',
    scopes: ['okta.users.read', 'okta.groups.read'],
    requestTimeoutMs: 15000
  },
  scim: {
    username: 'ips-reader',
    password: 'password'
  },
  port: 0
};

export function basic(username = 'ips-reader', password = 'password') {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

export async function withServer(app, fn) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}
