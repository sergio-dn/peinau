/**
 * SII Portal Authentication Module
 *
 * Authenticates via the SII web portal using RUT + clave.
 * This is the "Conector Portal" from the integration architecture.
 *
 * The SII login form at https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html
 * POSTs to https://zeusr.sii.cl/cgi_AUT2000/CAutInicio.cgi with fields:
 *   rut (body digits), dv (check digit), rutcntr (formatted), clave, referencia, 411
 *
 * On success the response sets a TOKEN cookie (and others like RUT_NS, DV_NS).
 * The TOKEN must be included in all subsequent SII API requests.
 */

// Re-export from the root auth module for now (will be fully moved later)
export { SiiAuth, SiiAuthError } from '../auth.js';
