/**
 * SII Authentication Module
 *
 * The SII uses a multi-step authentication process:
 * 1. POST credentials to https://zeusr.sii.cl/cgi_AUT2000/CAutInwor498.cgi
 *    Body form-data: rut_contribuyente, password, referession (sic)
 * 2. The response sets cookies including TOKEN
 * 3. The TOKEN cookie must be included in all subsequent requests
 *
 * The SII also has a SOAP-based auth at https://palena.sii.cl/DTEWS/GetTokenFromSeed.jws
 * but clave tributaria uses the simpler HTTP form method.
 */

import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import type { SiiCredentials, SiiSession } from './types.js';

const SII_AUTH_URL = 'https://zeusr.sii.cl/cgi_AUT2000/CAutInwor498.cgi';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export class SiiAuth {
  private session: SiiSession | null = null;
  private cookieJar: CookieJar;
  private client: ReturnType<typeof wrapper>;

  constructor(private credentials: SiiCredentials) {
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true,
      maxRedirects: 5,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }));
  }

  async authenticate(): Promise<SiiSession> {
    // Clean RUT for SII format (remove dots, keep dash)
    const rutClean = this.credentials.rut.replace(/\./g, '');
    const [rutBody, dv] = rutClean.split('-');

    const formData = new URLSearchParams({
      rut_contribuyente: rutBody,
      dv_contribuyente: dv,
      password: this.credentials.password,
      referession: '',  // Required field, can be empty
    });

    try {
      const response = await this.client.post(SII_AUTH_URL, formData.toString(), {
        validateStatus: (status) => status < 400 || status === 302,
      });

      // Check if authentication was successful by looking for error indicators
      const responseText = typeof response.data === 'string' ? response.data : '';
      if (responseText.includes('Clave Incorrecta') || responseText.includes('RUT NO VALIDO')) {
        throw new SiiAuthError('Invalid SII credentials');
      }

      // Extract TOKEN from cookie jar first, then from set-cookie header
      const cookies = await this.cookieJar.getCookies(SII_AUTH_URL);
      let tokenValue = cookies.find(c => c.key === 'TOKEN')?.value;

      if (!tokenValue) {
        // Try extracting from response headers directly
        const setCookies = response.headers['set-cookie'] || [];
        const tokenHeader = setCookies.find((c: string) => c.includes('TOKEN='));
        if (tokenHeader) {
          const match = tokenHeader.match(/TOKEN=([^;]+)/);
          tokenValue = match?.[1];
        }
      }

      if (!tokenValue) {
        throw new SiiAuthError('No TOKEN cookie received from SII');
      }

      this.session = {
        token: tokenValue,
        cookies: cookies.map(c => `${c.key}=${c.value}`),
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
      };

      return this.session;
    } catch (error) {
      if (error instanceof SiiAuthError) throw error;
      throw new SiiAuthError(`SII authentication failed: ${(error as Error).message}`);
    }
  }

  async getSession(): Promise<SiiSession> {
    if (!this.session || new Date() >= this.session.expiresAt) {
      return this.authenticate();
    }
    return this.session;
  }

  getCookieJar(): CookieJar {
    return this.cookieJar;
  }

  getClient() {
    return this.client;
  }

  isAuthenticated(): boolean {
    return this.session !== null && new Date() < this.session.expiresAt;
  }
}

export class SiiAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SiiAuthError';
  }
}
