if (process.env.NODE_ENV === 'development') {
  console.warn('[Deprecated] Use AppShell instead of AppLayout');
}
export { AppShell as AppLayout } from './AppShell';
