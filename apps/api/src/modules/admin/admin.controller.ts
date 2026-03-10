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

// POST /api/admin/sii-debug - Debug RCV query with raw responses
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
    const session = await auth.authenticate();

    // Clean RUT for API
    const rutClean = company.rut.replace(/\./g, '');
    const rutRaw = rutClean.replace(/[^0-9kK]/g, '');
    const rutBody = rutRaw.slice(0, -1);
    const dv = rutRaw.slice(-1).toUpperCase();

    const now = new Date();
    const periodo = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const prevPeriodo = `${prevYear}${String(prevMonth).padStart(2, '0')}`;

    const cookieStr = `TOKEN=${session.token}; CSESSIONID=${session.token}`;
    const client = auth.getClient();

    // Raw query helper
    const rawQuery = async (periodo: string, estado: string) => {
      const body = {
        metaData: {
          conversationId: session.token,
          namespace: 'cl.sii.sdi.lob.diii.consdcv.data.api.interfaces.FacadeService/getDetalleCompra',
          page: null,
          transactionId: '0',
        },
        data: {
          rutEmisor: rutBody,
          dvEmisor: dv,
          ptributario: periodo,
          estadoContab: estado,
          codTipoDoc: '0',
          operacion: 'COMPRA',
          accionRecaptcha: 'RCV_DDETC',
          tokenRecaptcha: 'c3',
        },
      };
      const resp = await client.post(
        'https://www4.sii.cl/consdcvinternetui/services/data/facadeService/getDetalleCompra',
        body,
        {
          headers: {
            'Content-Type': 'application/json;charset=utf-8',
            'Accept': 'application/json, text/plain, */*',
            'Cookie': cookieStr,
          },
          validateStatus: () => true,
        },
      );
      return { status: resp.status, data: resp.data };
    };

    // Also try getResumen to see if there's data at all
    const rawResumen = async (periodo: string) => {
      const body = {
        metaData: {
          conversationId: session.token,
          namespace: 'cl.sii.sdi.lob.diii.consdcv.data.api.interfaces.FacadeService/getResumen',
          page: null,
          transactionId: '0',
        },
        data: {
          rutEmisor: rutBody,
          dvEmisor: dv,
          ptributario: periodo,
          operacion: 'COMPRA',
          accionRecaptcha: 'RCV_DDETC',
          tokenRecaptcha: 'c3',
        },
      };
      const resp = await client.post(
        'https://www4.sii.cl/consdcvinternetui/services/data/facadeService/getResumen',
        body,
        {
          headers: {
            'Content-Type': 'application/json;charset=utf-8',
            'Accept': 'application/json, text/plain, */*',
            'Cookie': cookieStr,
          },
          validateStatus: () => true,
        },
      );
      return { status: resp.status, data: resp.data };
    };

    // Run queries
    const [curRegistro, curPendiente, prevRegistro, curResumen, prevResumen] = await Promise.all([
      rawQuery(periodo, 'REGISTRO'),
      rawQuery(periodo, 'PENDIENTE'),
      rawQuery(prevPeriodo, 'REGISTRO'),
      rawResumen(periodo),
      rawResumen(prevPeriodo),
    ]);

    res.json({
      companyRut: company.rut,
      parsedRut: `${rutBody}-${dv}`,
      siiUser: company.siiUsername,
      sessionCookies: session.cookies?.length || 0,
      currentPeriod: periodo,
      previousPeriod: prevPeriodo,
      raw: {
        currentRegistro: curRegistro,
        currentPendiente: curPendiente,
        previousRegistro: prevRegistro,
        currentResumen: curResumen,
        previousResumen: prevResumen,
      },
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
