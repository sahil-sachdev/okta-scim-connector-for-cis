import { randomUUID } from 'node:crypto';
import axios from 'axios';
import { importPKCS8, SignJWT } from 'jose';

export class OktaAuthClient {
  constructor(config, httpClient = axios) {
    this.config = config;
    this.httpClient = httpClient;
    this.cachedToken = null;
    this.inFlightRequest = null;
  }

  async getAccessToken() {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAtMs - 60000) {
      return this.cachedToken.accessToken;
    }

    if (!this.inFlightRequest) {
      this.inFlightRequest = this.requestAccessToken().finally(() => {
        this.inFlightRequest = null;
      });
    }

    return this.inFlightRequest;
  }

  async requestAccessToken() {
    const assertion = await this.createClientAssertion();
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: this.config.scopes.join(' '),
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: assertion
    });

    const response = await this.httpClient.post(this.config.tokenEndpoint, body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      timeout: this.config.requestTimeoutMs
    });

    const accessToken = response.data?.access_token;
    const expiresIn = Number(response.data?.expires_in);

    if (!accessToken || !Number.isFinite(expiresIn)) {
      throw new Error('Okta token response did not include a usable access token');
    }

    this.cachedToken = {
      accessToken,
      expiresAtMs: Date.now() + expiresIn * 1000
    };

    return accessToken;
  }

  async createClientAssertion() {
    const now = Math.floor(Date.now() / 1000);
    const key = await importPKCS8(this.config.privateKey, 'RS256');

    return new SignJWT({
      iss: this.config.clientId,
      sub: this.config.clientId,
      aud: this.config.tokenEndpoint,
      iat: now,
      exp: now + 300,
      jti: randomUUID()
    })
      .setProtectedHeader({ alg: 'RS256', kid: this.config.kid })
      .sign(key);
  }
}
