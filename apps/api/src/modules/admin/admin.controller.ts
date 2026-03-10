import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { companies, users, userRoles, siiSyncLogs } from '../../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { encrypt, decrypt } from '../../lib/encryption.js';
import { SiiAuth, RpetcClient } from '@wildlama/sii-client';
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
    siiConnected: !!(company.siiUsername && company.siiPasswordEncrypted),
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
});

export async function updateSiiCredentials(req: Request, res: Response) {
  const parsed = siiCredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid data', details: parsed.error.flatten() });
  }

  const encrypted = encrypt(parsed.data.siiPassword);

  await db.update(companies)
    .set({
      siiUsername: parsed.data.siiUsername,
      siiPasswordEncrypted: encrypted,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, req.user!.companyId));

  res.json({ success: true, message: 'Credenciales SII guardadas' });
}

// POST /api/admin/sii-test
export async function testSiiConnection(req: Request, res: Response) {
  const { siiUsername, siiPassword } = req.body;

  // Use provided credentials or fall back to stored ones
  let rut = siiUsername;
  let password = siiPassword;

  if (!rut || !password) {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, req.user!.companyId),
    });
    if (!company?.siiUsername || !company?.siiPasswordEncrypted) {
      return res.status(400).json({ error: 'No hay credenciales SII configuradas' });
    }
    rut = company.siiUsername;
    password = decrypt(company.siiPasswordEncrypted);
  }

  try {
    const auth = new SiiAuth({ rut, password });
    await auth.authenticate();
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

// POST /api/admin/sii-debug - Debug RCV query
export async function debugSiiQuery(req: Request, res: Response) {
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, req.user!.companyId),
  });

  if (!company?.siiUsername || !company?.siiPasswordEncrypted) {
    return res.status(400).json({ error: 'No hay credenciales SII configuradas' });
  }

  try {
    const password = decrypt(company.siiPasswordEncrypted);
    const auth = new SiiAuth({ rut: company.siiUsername, password });
    await auth.authenticate();

    const rpetc = new RpetcClient(auth);

    // Query current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const results = await rpetc.getMonthlyDtes(company.rut, year, month);

    // Also try previous month
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevResults = await rpetc.getMonthlyDtes(company.rut, prevYear, prevMonth);

    res.json({
      companyRut: company.rut,
      siiUser: company.siiUsername,
      currentMonth: { period: `${year}-${String(month).padStart(2, '0')}`, count: results.length, sample: results.slice(0, 3) },
      previousMonth: { period: `${prevYear}-${String(prevMonth).padStart(2, '0')}`, count: prevResults.length, sample: prevResults.slice(0, 3) },
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
