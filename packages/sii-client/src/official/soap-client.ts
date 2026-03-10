/**
 * SII Official SOAP Client (Placeholder)
 *
 * Consumes official SII SOAP web services with certificate-based token.
 * Available services include:
 * - QueryEstDte — query DTE status
 * - SendDTE — send DTE documents
 * - GetEstEnvio — check send status
 *
 * References:
 * - https://www.sii.cl/servicios_online/docs/estado_dte.pdf
 *
 * TODO: Implement when certificate-based auth is available.
 */

export class SiiSoapClient {
  constructor() {
    throw new Error(
      'SiiSoapClient is not yet implemented. ' +
      'This requires SiiCertAuth with a valid digital certificate. ' +
      'Use the portal-based clients instead.'
    );
  }
}
