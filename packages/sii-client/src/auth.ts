/**
 * SII Authentication Module
 *
 * The SII login form at https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html
 * POSTs to https://zeusr.sii.cl/cgi_AUT2000/CAutInicio.cgi with fields:
 *   rut (body digits), dv (check digit), rutcntr (formatted), clave, referencia, 411
 *
 * On success the response sets a TOKEN cookie (and others like RUT_NS, DV_NS).
 * The TOKEN must be included in all subsequent SII API requests.
 */

import axios, { AxiosInstance } from 'axios';
import type { SiiCredentials, SiiSession } from './types.js';

const SII_AUTH_URL = 'https://zeusr.sii.cl/cgi_AUT2000/CAutInicio.cgi';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export class SiiAuth {
  private session: SiiSession | null = null;
  private client: AxiosInstance;

  constructor(private credentials: SiiCredentials) {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-CL,es;q=0.9',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://zeusr.sii.cl',
        'Referer': 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://misiir.sii.cl/cgi_misii/siihome.cgi',
      },
    });
  }

  async authenticate(): Promise<SiiSession> {
    // Clean RUT: remove dots and spaces, keep dash
    const rutClean = this.credentials.rut.replace(/[\.\s]/g, '');
    // Strip all non-alphanumeric to get raw digits + DV
    const rutRaw = rutClean.replace(/[^0-9kK]/g, '');
    // Split into body (all but last char) and DV (last char)
    const rutBody = rutRaw.slice(0, -1);
    const dv = rutRaw.slice(-1).toUpperCase();

    // Build form exactly as the SII login page does
    const formData = new URLSearchParams({
      rut: rutBody,
      dv: dv,
      referencia: 'https://misiir.sii.cl/cgi_misii/siihome.cgi',
      '411': '',
      rutcntr: rutClean,
      clave: this.credentials.password,
    });

    try {
      const response = await this.client.post(SII_AUTH_URL, formData.toString(), {
        maxRedirects: 0, // Capture set-cookie from initial response
        validateStatus: () => true, // Accept any status (302, 200, etc.)
      });

      const responseText = typeof response.data === 'string' ? response.data : '';

      // Check for known SII error messages
      if (responseText.includes('Clave Incorrecta')) {
        throw new SiiAuthError('Clave SII incorrecta');
      }
      if (responseText.includes('RUT NO VALIDO') || responseText.includes('Rut Inv')) {
        throw new SiiAuthError('RUT SII no valido');
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

      // If 302 redirect and no cookies yet, follow the redirect manually to get cookies
      if (!tokenValue && (response.status === 301 || response.status === 302)) {
        const redirectUrl = response.headers['location'];
        if (redirectUrl) {
          const cookieHeader = allCookies.join('; ');
          const redirectResponse = await this.client.get(redirectUrl, {
            maxRedirects: 0,
            validateStatus: () => true,
            headers: {
              ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
            },
          });
          const redirectSetCookies: string[] = redirectResponse.headers['set-cookie'] || [];
          for (const cookie of redirectSetCookies) {
            const nameValue = cookie.split(';')[0];
            allCookies.push(nameValue);
            if (nameValue.startsWith('TOKEN=')) {
              tokenValue = nameValue.substring('TOKEN='.length);
            }
          }
        }
      }

      if (!tokenValue) {
        const status = response.status;
        const bodySnippet = responseText.substring(0, 300);
        console.error(`[SII Auth] No TOKEN. Status: ${status}, Cookies: ${JSON.stringify(setCookies)}, Body: ${bodySnippet}`);
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
