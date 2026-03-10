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
      // Collect all cookies across multiple requests/redirects
      const allCookies: string[] = [];
      let tokenValue: string | undefined;

      const extractCookies = (headers: any) => {
        const setCookies: string[] = headers['set-cookie'] || [];
        for (const cookie of setCookies) {
          const nameValue = cookie.split(';')[0];
          allCookies.push(nameValue);
          if (nameValue.startsWith('TOKEN=')) {
            tokenValue = nameValue.substring('TOKEN='.length);
          }
        }
        console.log(`[SII Auth] Cookies extracted: ${setCookies.map(c => c.split(';')[0].split('=')[0]).join(', ') || 'none'}`);
      };

      // Step 1: POST login form
      const response = await this.client.post(SII_AUTH_URL, formData.toString(), {
        maxRedirects: 0,
        validateStatus: () => true,
      });

      const responseText = typeof response.data === 'string' ? response.data : '';
      console.log(`[SII Auth] Step 1 - Status: ${response.status}, Body length: ${responseText.length}`);

      // Check for known SII error messages
      if (responseText.includes('Clave Incorrecta')) {
        throw new SiiAuthError('Clave SII incorrecta');
      }
      if (responseText.includes('RUT NO VALIDO') || responseText.includes('Rut Inv')) {
        throw new SiiAuthError('RUT SII no valido');
      }

      extractCookies(response.headers);

      // Step 2: Follow redirects manually (up to 5 hops) to collect all cookies
      let currentUrl: string | undefined;
      let currentStatus = response.status;
      let currentBody = responseText;

      // Check for HTTP redirect
      if (currentStatus === 301 || currentStatus === 302 || currentStatus === 303) {
        currentUrl = response.headers['location'];
      }
      // Check for meta refresh or JS redirect in 200 response
      if (!currentUrl && currentStatus === 200) {
        const metaMatch = currentBody.match(/url=([^"'\s>]+)/i);
        const jsMatch = currentBody.match(/(?:window\.location|location\.href)\s*=\s*['"]([^'"]+)['"]/i);
        currentUrl = metaMatch?.[1] || jsMatch?.[1];
        if (currentUrl) {
          console.log(`[SII Auth] Found redirect URL in body: ${currentUrl}`);
        }
      }

      for (let hop = 0; hop < 5 && currentUrl && !tokenValue; hop++) {
        // Resolve relative URLs
        if (currentUrl.startsWith('/')) {
          const urlObj = new URL(SII_AUTH_URL);
          currentUrl = `${urlObj.protocol}//${urlObj.host}${currentUrl}`;
        }
        console.log(`[SII Auth] Step ${hop + 2} - Following redirect to: ${currentUrl}`);

        const cookieHeader = allCookies.join('; ');
        const redirectResponse = await this.client.get(currentUrl, {
          maxRedirects: 0,
          validateStatus: () => true,
          headers: {
            'Cookie': cookieHeader,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });

        currentStatus = redirectResponse.status;
        currentBody = typeof redirectResponse.data === 'string' ? redirectResponse.data : '';
        console.log(`[SII Auth] Step ${hop + 2} - Status: ${currentStatus}`);

        extractCookies(redirectResponse.headers);

        // Check for more redirects
        currentUrl = undefined;
        if (currentStatus === 301 || currentStatus === 302 || currentStatus === 303) {
          currentUrl = redirectResponse.headers['location'];
        }
        if (!currentUrl && currentStatus === 200 && !tokenValue) {
          const metaMatch = currentBody.match(/url=([^"'\s>]+)/i);
          const jsMatch = currentBody.match(/(?:window\.location|location\.href)\s*=\s*['"]([^'"]+)['"]/i);
          currentUrl = metaMatch?.[1] || jsMatch?.[1];
        }
      }

      if (!tokenValue) {
        const bodySnippet = responseText.substring(0, 500);
        console.error(`[SII Auth] No TOKEN after all steps. Cookies: ${allCookies.map(c => c.split('=')[0]).join(', ')}`);
        console.error(`[SII Auth] Initial body: ${bodySnippet}`);
        throw new SiiAuthError(
          `No se recibio TOKEN del SII (status ${response.status}, ${allCookies.length} cookies: ${allCookies.map(c => c.split('=')[0]).join(', ')}). ` +
          `Verifique que las credenciales sean correctas.`
        );
      }

      console.log(`[SII Auth] Success! TOKEN obtained, ${allCookies.length} total cookies`);

      // Ensure CSESSIONID is included (needed for RCV API)
      const hasCSESSIONID = allCookies.some(c => c.startsWith('CSESSIONID='));
      if (!hasCSESSIONID) {
        allCookies.push(`CSESSIONID=${tokenValue}`);
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
