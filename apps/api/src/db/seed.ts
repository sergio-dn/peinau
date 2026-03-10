import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import * as schema from './schema.js';

async function seed() {
  const queryClient = postgres(process.env.DATABASE_URL!);
  const db = drizzle(queryClient, { schema });

  console.log('Seeding database...');

  // Create company
  const [company] = await db.insert(schema.companies).values({
    rut: '76.123.456-K',
    razonSocial: 'Wild Lama SpA',
    giro: 'Servicios tecnologicos',
    direccion: 'Santiago, Chile',
  }).returning();

  console.log('Created company:', company.razonSocial);

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 12);
  const [adminUser] = await db.insert(schema.users).values({
    companyId: company.id,
    email: 'admin@wildlama.cl',
    passwordHash,
    name: 'Admin Wild Lama',
  }).returning();

  await db.insert(schema.userRoles).values({ userId: adminUser.id, role: 'admin' });

  // Create contabilidad user
  const [contaUser] = await db.insert(schema.users).values({
    companyId: company.id,
    email: 'contabilidad@wildlama.cl',
    passwordHash,
    name: 'Contabilidad Wild Lama',
  }).returning();

  await db.insert(schema.userRoles).values({ userId: contaUser.id, role: 'contabilidad' });

  // Create approver user
  const [approverUser] = await db.insert(schema.users).values({
    companyId: company.id,
    email: 'aprobador@wildlama.cl',
    passwordHash,
    name: 'Aprobador Wild Lama',
  }).returning();

  await db.insert(schema.userRoles).values({ userId: approverUser.id, role: 'aprobador' });

  // Create sample chart of accounts
  const accounts = [
    { code: '1.1.01', name: 'Caja', companyId: company.id },
    { code: '1.1.02', name: 'Banco', companyId: company.id },
    { code: '2.1.01', name: 'Proveedores', companyId: company.id },
    { code: '4.1.01', name: 'Servicios externos', companyId: company.id },
    { code: '4.1.02', name: 'Suministros oficina', companyId: company.id },
    { code: '4.1.03', name: 'Arriendo', companyId: company.id },
    { code: '4.1.04', name: 'Servicios basicos', companyId: company.id },
    { code: '4.2.01', name: 'Honorarios', companyId: company.id },
  ];
  await db.insert(schema.chartOfAccounts).values(accounts);

  // Create sample cost centers
  const costCenterValues = [
    { code: 'ADM', name: 'Administracion', companyId: company.id },
    { code: 'TEC', name: 'Tecnologia', companyId: company.id },
    { code: 'COM', name: 'Comercial', companyId: company.id },
    { code: 'OPS', name: 'Operaciones', companyId: company.id },
  ];
  await db.insert(schema.costCenters).values(costCenterValues);

  // Create approval workflow
  const [workflow] = await db.insert(schema.approvalWorkflows).values({
    companyId: company.id,
    name: 'Flujo estandar',
    isActive: true,
  }).returning();

  const [level1] = await db.insert(schema.approvalWorkflowLevels).values({
    workflowId: workflow.id,
    levelOrder: 1,
    name: 'Aprobacion Jefe',
    minAmount: 0,
    requiresAllApprovers: false,
  }).returning();

  await db.insert(schema.approvalWorkflowLevelApprovers).values({
    levelId: level1.id,
    userId: approverUser.id,
  });

  console.log('Seed completed successfully!');
  await queryClient.end();
}

seed().catch(console.error);
