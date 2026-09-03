import axios from 'axios';

export class OktaClient {
  constructor(config, authClient, httpClient = axios) {
    this.config = config;
    this.authClient = authClient;
    this.httpClient = httpClient;
  }

  async getAll(path) {
    const accessToken = await this.authClient.getAccessToken();
    let url = `${this.config.baseUrl}${path}`;
    const results = [];

    while (url) {
      const response = await this.httpClient.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        },
        timeout: this.config.requestTimeoutMs,
        validateStatus: (status) => status >= 200 && status < 300
      });

      results.push(...response.data);
      url = getNextLink(response.headers?.link);
    }

    return results;
  }
}

export function getNextLink(linkHeader) {
  if (!linkHeader) {
    return null;
  }

  const links = linkHeader.split(',');
  for (const link of links) {
    const match = link.match(/<([^>]+)>\s*;\s*rel="next"/i);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export function sanitizeOktaError(error) {
  const status = error.response?.status;
  const retryAfter = error.response?.headers?.['retry-after'];

  if (status === 429) {
    return `Okta rate limit exceeded${retryAfter ? `; retry after ${retryAfter} seconds` : ''}`;
  }

  if ([400, 401, 403].includes(status)) {
    return `Okta request failed with status ${status}`;
  }

  if (status >= 500) {
    return `Okta service failed with status ${status}`;
  }

  return 'Okta request failed';
}
