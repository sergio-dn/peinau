// Main exports — backward compatible
export { SiiAuth, SiiAuthError } from './auth.js';
export { RpetcClient, RpetcError } from './rpetc.js';
export { DteDownloader, DteDownloadError } from './dte-downloader.js';
export { DteParser, DteParseError } from './dte-parser.js';

// New facade
export { SiiDocumentsService } from './documents-service.js';

// Types — export from shared (canonical location)
export type {
  SiiCredentials,
  SiiSession,
  RpetcQuery,
  RpetcEntry,
  DteDocument,
  DteDetalleLine,
  SiiSyncResult,
  NormalizedDocument,
} from './shared/types.js';

// Sub-module re-exports for organized access
export * as portal from './portal/index.js';
export * as official from './official/index.js';
export * as shared from './shared/index.js';
