/**
 * SII Official Certificate-Based Authentication (Placeholder)
 *
 * The official SII authentication flow for program-to-program integration:
 * 1. CrSeed — request a seed (semilla) from the SII
 * 2. Sign the seed XML with the private key from a .p12/.pfx certificate
 * 3. GetTokenFromSeed — exchange signed seed for a token (valid 1 hour)
 * 4. Use token for official SOAP web services
 *
 * References:
 * - https://www.sii.cl/factura_electronica/factura_mercado/autenticacion.pdf
 * - https://www.sii.cl/factura_electronica/factura_mercado/instructivo.htm
 *
 * TODO: Implement when digital certificate (.p12) is available.
 */

export class SiiCertAuth {
  constructor(_pfxPath: string, _pfxPassword: string) {
    throw new Error(
      'SiiCertAuth is not yet implemented. ' +
      'This requires a digital certificate (.p12/.pfx) from the SII. ' +
      'Use SiiAuth (portal auth with RUT/clave) instead.'
    );
  }
}
