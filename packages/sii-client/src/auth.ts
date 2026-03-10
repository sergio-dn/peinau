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

import axios, { AxiosInstance } from 'axios';
import type { SiiCredentials, SiiSession } from './types.js';

const SII_AUTH_URL = 'https://zeusr.sii.cl/cgi_AUT2000/CAutInwor498.cgi';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export class SiiAuth {
  private session: SiiSession | null = null;
  private client: AxiosInstance;

  constructor(private credentials: SiiCredentials) {
    this.client = axios.create({
      timeout: 30000,
      maxRedirects: 0, // Don't follow redirects so we can capture set-cookie
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
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
        validateStatus: () => true, // Accept any status to inspect response
      });

      const responseText = typeof response.data === 'string' ? response.data : '';

      // Check for known error messages in response body
      if (responseText.includes('Clave Incorrecta') || responseText.includes('RUT NO VALIDO')) {
        throw new SiiAuthError('Credenciales SII invalidas');
      }

      // Extract all cookies from set-cookie headers
      const setCookies: string[] = response.headers['set-cookie'] || [];
      const allCookies: string[] = [];
      let tokenValue: string | undefined;

      for (const cookie of setCookies) {
        const nameValue = cookie.split(';')[0]; // e.g. "TOKEN=abc123"
        allCookies.push(nameValue);
        if (nameValue.startsWith('TOKEN=')) {
          tokenValue = nameValue.substring('TOKEN='.length);
        }
      }

      if (!tokenValue) {
        // Log response details for debugging
        const status = response.status;
        const bodySnippet = responseText.substring(0, 500);
        console.error(`[SII Auth] No TOKEN cookie. Status: ${status}, Cookies: ${JSON.stringify(setCookies)}, Body: ${bodySnippet}`);
        throw new SiiAuthError(
          `No se recibio TOKEN del SII (status ${status}, ${setCookies.length} cookies). ` +
          `Verifique que las credenciales sean correctas.`
        );
      }

      this.session = {
        token: tokenValue,
        cookies: allCookies,
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
      };

      return this.session;
    } catch (error) {
      if (error instanceof SiiAuthError) throw error;
      throw new SiiAuthError(`Error de conexion al SII: ${(error as Error).message}`);
    }
  }

  async getSession(): Promise<SiiSession> {
    if (!this.session || new Date() >= this.session.expiresAt) {
      return this.authenticate();
    }
    return this.session;
  }

  getClient() {
    return this.client;
  }

  getSessionCookies(): string {
    return this.session?.cookies.join('; ') || '';
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
