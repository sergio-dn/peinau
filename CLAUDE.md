# Peinau — Guía para Claude

## Stack
- **Frontend**: React + TypeScript + Vite (`apps/web`)
- **Backend**: Node.js API (`apps/api`) → desplegada en Cloud Run
- **Frontend deploy**: Vercel
- **Monorepo**: pnpm workspaces + Turborepo
- **UI**: TailwindCSS + Radix UI / shadcn
- **State**: Zustand (`useFilterStore`, `useAuthStore`)
- **Data fetching**: TanStack Query
- **Router**: react-router-dom v6
- **Icons**: lucide-react
- **Dates**: date-fns con locale `es`
- **Toasts**: sonner

## Reglas críticas de desarrollo

### Imports — verificar todos los usos antes de eliminar
Antes de quitar un import, hacer grep del símbolo en el archivo completo. En archivos con múltiples componentes (como ReportsPage.tsx), un componente puede usar un import que otro modificó.

```bash
# Verificar antes de eliminar 'BarChart':
grep -n 'BarChart' src/pages/ReportsPage.tsx
```

---

## Reglas críticas de entorno

### Variables de entorno — Vite (frontend)
**NUNCA usar `process.env` en código del frontend.** Vite no expone `process` — causa error TS2580 en build.

Usar siempre la API de Vite:
```ts
// ✅ Correcto
if (import.meta.env.DEV) { ... }
if (import.meta.env.PROD) { ... }
const url = import.meta.env.VITE_API_URL;

// ❌ Rompe el build en Vercel
if (process.env.NODE_ENV === 'development') { ... }
```

### Variables de entorno — API (backend Node.js)
En `apps/api` sí se puede usar `process.env` con normalidad.

## Paths de importación frecuentes
```ts
import apiClient from '@/api/client';
import { useFilterStore } from '@/stores/filter-store';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { formatDateShort, formatDatetime } from '@/lib/format-date';
```

## Componentes UI reutilizables
- `@/components/ui/EmptyState` — empty states con icono, título, descripción y acción
- `@/components/ui/DataTable` — tabla con soporte `meta.hiddenOnMobile` para responsive
- `@/components/invoices/InvoiceStateBadge` — badge de estado con icono
- `@/components/invoices/InvoiceStateFlow` — stepper visual del flujo de aprobación

## Layout
- El layout canónico es `AppShell` (`components/layout/AppShell.tsx`)
- `AppLayout` es un re-export deprecado — no usar en código nuevo

## Colores de estado (no inventar nuevos)
```
recibida:      bg-blue-500/10   text-blue-700   border-blue-500/20
pendiente:     bg-amber-500/10  text-amber-700  border-amber-500/20
aprobada:      bg-emerald-500/10 text-emerald-700 border-emerald-500/20
contabilizada: bg-indigo-500/10 text-indigo-700 border-indigo-500/20
en_nomina:     bg-violet-500/10 text-violet-700 border-violet-500/20
pagada:        bg-teal-500/10   text-teal-700   border-teal-500/20
rechazada:     bg-rose-500/10   text-rose-700   border-rose-500/20
```

## Flujo de estados de factura
recibida → pendiente → aprobada → contabilizada → en_nomina → pagada
(rechazada es estado terminal fuera del flujo)
