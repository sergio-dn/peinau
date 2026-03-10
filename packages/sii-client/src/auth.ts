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
const MAX_AUTH_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

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
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_AUTH_RETRIES; attempt++) {
      try {
        const session = await this.tryAuthenticate(attempt);
        return session;
      } catch (error) {
        lastError = error as Error;
        // Don't retry on credential errors
        if (error instanceof SiiAuthError &&
            (error.message.includes('Clave SII incorrecta') ||
             error.message.includes('RUT SII no valido'))) {
          throw error;
        }
        if (attempt < MAX_AUTH_RETRIES) {
          console.log(`[SII Auth] Attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS}ms...`);
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }

    throw lastError || new SiiAuthError('Error de autenticacion SII');
  }

  private async tryAuthenticate(attempt: number): Promise<SiiSession> {
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

    // Collect all cookies across multiple requests/redirects
    const allCookies: string[] = [];
    let tokenValue: string | undefined;

    const extractCookies = (headers: any) => {
      const setCookies: string[] = headers['set-cookie'] || [];
      for (const cookie of setCookies) {
        const nameValue = cookie.split(';')[0];
        // Skip duplicate cookie names, keep latest
        const cookieName = nameValue.split('=')[0];
        const existingIdx = allCookies.findIndex(c => c.startsWith(cookieName + '='));
        if (existingIdx >= 0) {
          allCookies[existingIdx] = nameValue;
        } else {
          allCookies.push(nameValue);
        }
        if (nameValue.startsWith('TOKEN=')) {
          tokenValue = nameValue.substring('TOKEN='.length);
        }
      }
    };

    // Step 0: GET the login page first to obtain session/load-balancer cookies
    const LOGIN_PAGE = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://misiir.sii.cl/cgi_misii/siihome.cgi';
    console.log(`[SII Auth] Attempt ${attempt} - GET login page to obtain initial cookies`);
    const loginPage = await this.client.get(LOGIN_PAGE, {
      maxRedirects: 5,
      validateStatus: () => true,
    });
    extractCookies(loginPage.headers);
    console.log(`[SII Auth] Login page status: ${loginPage.status}, initial cookies: ${allCookies.map(c => c.split('=')[0]).join(', ')}`);

    // Step 1: POST login form WITH the initial cookies
    console.log(`[SII Auth] Attempt ${attempt} - POST to ${SII_AUTH_URL}`);
    const response = await this.client.post(SII_AUTH_URL, formData.toString(), {
      maxRedirects: 0,
      validateStatus: () => true,
      headers: {
        'Cookie': allCookies.join('; '),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://zeusr.sii.cl',
        'Referer': LOGIN_PAGE,
      },
    });

    const responseText = typeof response.data === 'string' ? response.data : '';
    console.log(`[SII Auth] Step 1 - Status: ${response.status}, Body length: ${responseText.length}`);

    // Check for known SII error messages
    if (responseText.includes('Clave Incorrecta') || responseText.includes('CLAVE INCORRECTA')) {
      throw new SiiAuthError('Clave SII incorrecta');
    }
    if (responseText.includes('RUT NO VALIDO') || responseText.includes('Rut Inv')) {
      throw new SiiAuthError('RUT SII no valido');
    }

    extractCookies(response.headers);

    // Follow redirects manually (up to 5 hops) to collect all cookies
    let currentUrl: string | undefined;
    let currentStatus = response.status;
    let currentBody = responseText;

    // Check for HTTP redirect
    if (currentStatus === 301 || currentStatus === 302 || currentStatus === 303) {
      currentUrl = response.headers['location'];
    }
    // Check for meta refresh or JS redirect in 200 response
    if (!currentUrl && currentStatus === 200) {
      currentUrl = this.findRedirectUrl(currentBody);
      if (currentUrl) {
        console.log(`[SII Auth] Found redirect in body: ${currentUrl.substring(0, 100)}`);
      }
    }

    for (let hop = 0; hop < 5 && currentUrl && !tokenValue; hop++) {
      // Resolve relative URLs
      if (currentUrl.startsWith('/')) {
        const urlObj = new URL(SII_AUTH_URL);
        currentUrl = `${urlObj.protocol}//${urlObj.host}${currentUrl}`;
      }
      console.log(`[SII Auth] Step ${hop + 2} - Following redirect to: ${currentUrl.substring(0, 100)}`);

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
      console.log(`[SII Auth] Step ${hop + 2} - Status: ${currentStatus}, Body length: ${currentBody.length}`);

      extractCookies(redirectResponse.headers);

      // Check for more redirects
      currentUrl = undefined;
      if (currentStatus === 301 || currentStatus === 302 || currentStatus === 303) {
        currentUrl = redirectResponse.headers['location'];
      }
      if (!currentUrl && currentStatus === 200 && !tokenValue) {
        currentUrl = this.findRedirectUrl(currentBody);
      }
    }

    // Strategy 2: If no TOKEN yet, try again with auto-redirect following
    if (!tokenValue) {
      console.log(`[SII Auth] No TOKEN from manual redirects, trying auto-redirect strategy...`);
      const autoResponse = await this.client.post(SII_AUTH_URL, formData.toString(), {
        maxRedirects: 10,
        validateStatus: () => true,
      });
      extractCookies(autoResponse.headers);

      // Also check if the final page has a redirect
      if (!tokenValue) {
        const autoBody = typeof autoResponse.data === 'string' ? autoResponse.data : '';
        const autoUrl = this.findRedirectUrl(autoBody);
        if (autoUrl) {
          console.log(`[SII Auth] Auto-redirect body has URL: ${autoUrl.substring(0, 100)}`);
          const finalResp = await this.client.get(
            autoUrl.startsWith('/') ? `https://zeusr.sii.cl${autoUrl}` : autoUrl,
            {
              maxRedirects: 5,
              validateStatus: () => true,
              headers: { 'Cookie': allCookies.join('; ') },
            },
          );
          extractCookies(finalResp.headers);
        }
      }
    }

    if (!tokenValue) {
      const cookieNames = allCookies.map(c => c.split('=')[0]).join(', ');
      const bodySnippet = responseText.substring(0, 300).replace(/\s+/g, ' ');
      console.error(`[SII Auth] No TOKEN. Cookies: ${cookieNames}`);
      console.error(`[SII Auth] Body snippet: ${bodySnippet}`);
      throw new SiiAuthError(
        `No se recibio TOKEN del SII (status ${response.status}, ${allCookies.length} cookies: ${cookieNames}). ` +
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
  }

  /**
   * Find redirect URL in HTML body (meta refresh, JS redirect, or form action)
   */
  private findRedirectUrl(body: string): string | undefined {
    // Meta refresh: <meta http-equiv="refresh" content="0;url=...">
    const metaMatch = body.match(/content\s*=\s*["'][^"']*url=([^"'\s>]+)/i);
    if (metaMatch) return metaMatch[1];

    // JS redirect: window.location = "..." or location.href = "..."
    const jsMatch = body.match(/(?:window\.location|location\.href|location\.replace)\s*[=(]\s*['"]([^'"]+)['"]/i);
    if (jsMatch) return jsMatch[1];

    // URL in meta tag: <meta ... url=...>
    const metaUrl = body.match(/url=([^"'\s>]+)/i);
    if (metaUrl) return metaUrl[1];

    return undefined;
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
