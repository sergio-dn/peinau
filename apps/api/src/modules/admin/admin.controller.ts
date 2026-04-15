import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { companies, users, userRoles, siiSyncLogs } from '../../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { encrypt } from '../../lib/encryption.js';
import { siiApiClient } from '../../lib/sii-api-client.js';
import { env } from '../../config/env.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// GET /api/admin/settings
export async function getSettings(req: Request, res: Response) {
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, req.user!.companyId),
  });

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const [lastSync] = await db.select()
    .from(siiSyncLogs)
    .where(eq(siiSyncLogs.companyId, company.id))
    .orderBy(desc(siiSyncLogs.startedAt))
    .limit(1);

  res.json({
    companyName: company.razonSocial,
    rutEmpresa: company.rut,
    giro: company.giro,
    direccion: company.direccion,
    siiConnected: !!(env.SII_API_KEY),
    siiUsername: company.siiUsername || null,
    lastSync: lastSync?.startedAt || null,
    lastSyncStatus: lastSync?.status || null,
  });
}

// PUT /api/admin/settings
const updateSettingsSchema = z.object({
  razonSocial: z.string().min(1).optional(),
  rut: z.string().min(1).optional(),
  giro: z.string().optional(),
  direccion: z.string().optional(),
});

export async function updateSettings(req: Request, res: Response) {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid data', details: parsed.error.flatten() });
  }

  const [updated] = await db.update(companies)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(companies.id, req.user!.companyId))
    .returning();

  res.json({
    companyName: updated.razonSocial,
    rutEmpresa: updated.rut,
    giro: updated.giro,
    direccion: updated.direccion,
  });
}

// PUT /api/admin/sii-credentials
const siiCredentialsSchema = z.object({
  siiUsername: z.string().min(1, 'RUT SII es requerido'),
  siiPassword: z.string().min(1, 'Clave SII es requerida'),
  siiApiKey: z.string().optional(),
});

export async function updateSiiCredentials(req: Request, res: Response) {
  const parsed = siiCredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid data', details: parsed.error.flatten() });
  }

  const encrypted = encrypt(parsed.data.siiPassword);

  const updatePayload: Record<string, any> = {
    siiUsername: parsed.data.siiUsername,
    siiPasswordEncrypted: encrypted,
    updatedAt: new Date(),
  };

  // Store encrypted API key only if provided and the column exists in the schema
  if (parsed.data.siiApiKey) {
    try {
      const encryptedApiKey = encrypt(parsed.data.siiApiKey);
      if ('siiApiKeyEncrypted' in (companies as any)) {
        updatePayload.siiApiKeyEncrypted = encryptedApiKey;
      }
    } catch {
      // Column doesn't exist yet — skip silently
    }
  }

  await db.update(companies)
    .set(updatePayload)
    .where(eq(companies.id, req.user!.companyId));

  res.json({ success: true, message: 'Credenciales SII guardadas' });
}

// POST /api/admin/sii-test
export async function testSiiConnection(req: Request, res: Response) {
  if (!env.SII_API_KEY) {
    return res.status(400).json({
      success: false,
      error: 'Token SII API no configurado en el servidor',
    });
  }

  try {
    // Test by triggering a sync status check — if the API key is valid, it works
    await siiApiClient.getSyncStatus();
    res.json({ success: true, message: 'Conexion exitosa con el SII' });
  } catch (err: any) {
    console.error('[SII Test] Connection error:', err.message);
    res.status(400).json({
      success: false,
      error: `No se pudo conectar al SII: ${err.message}`,
      detail: err.message,
    });
  }
}

// GET /api/admin/users
export async function listUsers(req: Request, res: Response) {
  const companyUsers = await db.query.users.findMany({
    where: eq(users.companyId, req.user!.companyId),
    with: { roles: true },
    columns: { passwordHash: false },
  });

  const result = companyUsers.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isActive: u.isActive,
    createdAt: u.createdAt,
    roles: u.roles.map(r => r.role),
  }));

  res.json(result);
}

// POST /api/admin/users
const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  roles: z.array(z.string()).min(1),
});

export async function createUser(req: Request, res: Response) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid data', details: parsed.error.flatten() });
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });
  if (existing) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const [newUser] = await db.insert(users).values({
    companyId: req.user!.companyId,
    email: parsed.data.email,
    passwordHash,
    name: parsed.data.name,
  }).returning();

  for (const role of parsed.data.roles) {
    await db.insert(userRoles).values({
      userId: newUser.id,
      role: role as any,
    });
  }

  res.status(201).json({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    roles: parsed.data.roles,
  });
}

// POST /api/admin/sii-debug - Debug SII API query
export async function debugSiiQuery(req: Request, res: Response) {
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, req.user!.companyId),
  });

  if (!company?.siiUsername || !company?.siiPasswordEncrypted) {
    return res.status(400).json({ error: 'No hay credenciales SII configuradas' });
  }

  try {
    const now = new Date();
    const periodo = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const prevPeriodo = `${prevYear}${String(prevMonth).padStart(2, '0')}`;

    const [periodos, syncStatus, resumenActual, resumenPrev, comprasActual] = await Promise.all([
      siiApiClient.getPeriodos().catch(() => []),
      siiApiClient.getSyncStatus().catch(() => ({ rut: company.rut, logs: [] })),
      siiApiClient.getResumen(periodo).catch(() => null),
      siiApiClient.getResumen(prevPeriodo).catch(() => null),
      siiApiClient.getCompras(periodo, 5, 0).catch(() => null),
    ]);

    res.json({
      companyRut: company.rut,
      siiUser: company.siiUsername,
      currentPeriod: periodo,
      previousPeriod: prevPeriodo,
      periodos,
      syncStatus: syncStatus.logs,
      resumen: {
        [periodo]: resumenActual,
        [prevPeriodo]: resumenPrev,
      },
      sampleCompras: comprasActual,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, stack: err.stack?.split('\n').slice(0, 5) });
  }
}

// PUT /api/admin/users/:id
export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const { isActive } = req.body;

  const [updated] = await db.update(users)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  if (!updated) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ id: updated.id, isActive: updated.isActive });
}
