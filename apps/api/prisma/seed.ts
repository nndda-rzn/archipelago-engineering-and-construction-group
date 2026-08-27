import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const permissions = [
  ['LegalEntity.VIEW', 'LegalEntity', 'VIEW'],
  ['LegalEntity.CREATE', 'LegalEntity', 'CREATE'],
  ['LegalEntity.EDIT', 'LegalEntity', 'EDIT'],
  ['LegalEntity.BLOCK', 'LegalEntity', 'BLOCK'],
  ['User.VIEW', 'User', 'VIEW'],
  ['User.CREATE', 'User', 'CREATE'],
  ['User.BLOCK', 'User', 'BLOCK'],
  ['Role.VIEW', 'Role', 'VIEW'],
  ['Role.CREATE', 'Role', 'CREATE'],
  ['Role.EDIT', 'Role', 'EDIT'],
  ['Audit.VIEW', 'Audit', 'VIEW'],
  ['Project.VIEW', 'Project', 'VIEW'],
  ['Project.CREATE', 'Project', 'CREATE'],
  ['Project.EDIT', 'Project', 'EDIT'],
  ['WBS.VIEW', 'WBS', 'VIEW'],
  ['WBS.CREATE', 'WBS', 'CREATE'],
  ['WBS.EDIT', 'WBS', 'EDIT'],
  ['Budget.VIEW', 'Budget', 'VIEW'],
  ['Budget.CREATE', 'Budget', 'CREATE'],
  ['Budget.APPROVE', 'Budget', 'APPROVE'],
  ['PurchaseRequisition.VIEW', 'PurchaseRequisition', 'VIEW'],
  ['PurchaseRequisition.CREATE', 'PurchaseRequisition', 'CREATE'],
  ['PurchaseRequisition.APPROVE', 'PurchaseRequisition', 'APPROVE'],
  ['PurchaseOrder.VIEW', 'PurchaseOrder', 'VIEW'],
  ['PurchaseOrder.CREATE', 'PurchaseOrder', 'CREATE'],
  ['PurchaseOrder.APPROVE', 'PurchaseOrder', 'APPROVE'],
  ['PurchaseOrder.RELEASE', 'PurchaseOrder', 'RELEASE'],
  ['Rfq.VIEW', 'Rfq', 'VIEW'],
  ['Rfq.CREATE', 'Rfq', 'CREATE'],
  ['Rfq.SEND', 'Rfq', 'SEND'],
  ['Rfq.QUOTE', 'Rfq', 'QUOTE'],
  ['Rfq.EVALUATE', 'Rfq', 'EVALUATE'],
  ['Warehouse.VIEW', 'Warehouse', 'VIEW'],
  ['Warehouse.CREATE', 'Warehouse', 'CREATE'],
  ['GoodsReceipt.VIEW', 'GoodsReceipt', 'VIEW'],
  ['GoodsReceipt.CREATE', 'GoodsReceipt', 'CREATE'],
  ['StockLedger.VIEW', 'StockLedger', 'VIEW'],
  ['MaterialIssue.VIEW', 'MaterialIssue', 'VIEW'],
  ['MaterialIssue.CREATE', 'MaterialIssue', 'CREATE'],
  ['Approval.VIEW', 'Approval', 'VIEW'],
  ['Approval.SUBMIT', 'Approval', 'SUBMIT'],
  ['Approval.APPROVE', 'Approval', 'APPROVE'],
  ['Workflow.VIEW', 'Workflow', 'VIEW'],
  ['Workflow.CREATE', 'Workflow', 'CREATE'],
  ['Workflow.EDIT', 'Workflow', 'EDIT'],
  ['StockAdjustment.VIEW', 'StockAdjustment', 'VIEW'],
  ['StockAdjustment.CREATE', 'StockAdjustment', 'CREATE'],
  ['StockAdjustment.APPROVE', 'StockAdjustment', 'APPROVE'],
  ['StockOpname.VIEW', 'StockOpname', 'VIEW'],
  ['StockOpname.CREATE', 'StockOpname', 'CREATE'],
  ['StockTransfer.VIEW', 'StockTransfer', 'VIEW'],
  ['StockTransfer.CREATE', 'StockTransfer', 'CREATE'],
  ['ChartOfAccount.VIEW', 'ChartOfAccount', 'VIEW'],
  ['ChartOfAccount.CREATE', 'ChartOfAccount', 'CREATE'],
  ['Journal.VIEW', 'Journal', 'VIEW'],
  ['Journal.CREATE', 'Journal', 'CREATE'],
  ['Journal.POST', 'Journal', 'POST'],
  ['ProgressClaim.VIEW', 'ProgressClaim', 'VIEW'],
  ['ProgressClaim.CREATE', 'ProgressClaim', 'CREATE'],
  ['ProgressClaim.CERTIFY', 'ProgressClaim', 'CERTIFY'],
  ['ClientInvoice.VIEW', 'ClientInvoice', 'VIEW'],
  ['ClientInvoice.CREATE', 'ClientInvoice', 'CREATE'],
  ['ClientInvoice.POST', 'ClientInvoice', 'POST'],
  ['Collection.VIEW', 'Collection', 'VIEW'],
  ['Collection.CREATE', 'Collection', 'CREATE'],
  ['Collection.POST', 'Collection', 'POST'],
  ['Variation.VIEW', 'Variation', 'VIEW'],
  ['Variation.CREATE', 'Variation', 'CREATE'],
  ['Variation.APPROVE', 'Variation', 'APPROVE'],
  ['Variation.REJECT', 'Variation', 'REJECT'],
  ['Subcontract.VIEW', 'Subcontract', 'VIEW'],
  ['Subcontract.CREATE', 'Subcontract', 'CREATE'],
  ['SubcontractProgress.CREATE', 'SubcontractProgress', 'CREATE'],
  ['SubcontractProgress.VERIFY', 'SubcontractProgress', 'VERIFY'],
  ['SubcontractProgress.REJECT', 'SubcontractProgress', 'REJECT'],
  ['Employee.VIEW', 'Employee', 'VIEW'],
  ['Employee.CREATE', 'Employee', 'CREATE'],
  ['EmployeeAssignment.CREATE', 'EmployeeAssignment', 'CREATE'],
  ['Timesheet.VIEW', 'Timesheet', 'VIEW'],
  ['Timesheet.CREATE', 'Timesheet', 'CREATE'],
  ['Timesheet.APPROVE', 'Timesheet', 'APPROVE'],
  ['Equipment.VIEW', 'Equipment', 'VIEW'],
  ['Equipment.CREATE', 'Equipment', 'CREATE'],
  ['Equipment.OPERATE', 'Equipment', 'OPERATE'],
  ['Equipment.PM', 'Equipment', 'PM'],
  ['EquipmentAssignment.CREATE', 'EquipmentAssignment', 'CREATE'],
  ['Payroll.VIEW', 'Payroll', 'VIEW'],
  ['Payroll.CREATE', 'Payroll', 'CREATE'],
  ['SafetyObservation.VIEW', 'SafetyObservation', 'VIEW'],
  ['SafetyObservation.CREATE', 'SafetyObservation', 'CREATE'],
  ['SafetyObservation.RESOLVE', 'SafetyObservation', 'RESOLVE'],
  ['HseIncident.VIEW', 'HseIncident', 'VIEW'],
  ['HseIncident.CREATE', 'HseIncident', 'CREATE'],
  ['HseIncident.INVESTIGATE', 'HseIncident', 'INVESTIGATE'],
  ['HseIncident.RESOLVE', 'HseIncident', 'RESOLVE'],
  ['PermitToWork.VIEW', 'PermitToWork', 'VIEW'],
  ['PermitToWork.CREATE', 'PermitToWork', 'CREATE'],
  ['PermitToWork.REVOKE', 'PermitToWork', 'REVOKE'],
  ['CorrectiveAction.CREATE', 'CorrectiveAction', 'CREATE'],
  ['CorrectiveAction.VERIFY', 'CorrectiveAction', 'VERIFY'],
  ['Quality.VIEW', 'Quality', 'VIEW'],
  ['Quality.CREATE', 'Quality', 'CREATE'],
  ['Quality.INSPECT', 'Quality', 'INSPECT'],
  ['Quality.CLOSE', 'Quality', 'CLOSE'],
  ['Risk.VIEW', 'Risk', 'VIEW'],
  ['Risk.CREATE', 'Risk', 'CREATE'],
  ['Risk.EDIT', 'Risk', 'EDIT'],
  ['Audit.CREATE', 'Audit', 'CREATE'],
  ['Audit.EDIT', 'Audit', 'EDIT'],
  ['LegalCase.VIEW', 'LegalCase', 'VIEW'],
  ['LegalCase.CREATE', 'LegalCase', 'CREATE'],
  ['LegalCase.EDIT', 'LegalCase', 'EDIT'],
  ['AccessReview.VIEW', 'AccessReview', 'VIEW'],
  ['AccessReview.CREATE', 'AccessReview', 'CREATE'],
  ['AccessReview.EDIT', 'AccessReview', 'EDIT'],
  ['Analytics.VIEW', 'Analytics', 'VIEW'],
  ['Client.VIEW', 'Client', 'VIEW'],
  ['Client.CREATE', 'Client', 'CREATE'],
  ['Opportunity.VIEW', 'Opportunity', 'VIEW'],
  ['Opportunity.CREATE', 'Opportunity', 'CREATE'],
  ['Opportunity.EDIT', 'Opportunity', 'EDIT'],
  ['Contract.VIEW', 'Contract', 'VIEW'],
  ['Contract.CREATE', 'Contract', 'CREATE'],
  ['Contract.EXECUTE', 'Contract', 'EXECUTE'],
  ['Contract.EDIT', 'Contract', 'EDIT'],
  ['Engineering.VIEW', 'Engineering', 'VIEW'],
  ['Engineering.CREATE', 'Engineering', 'CREATE'],
  ['Engineering.EDIT', 'Engineering', 'EDIT'],
  ['Vendor.VIEW', 'Vendor', 'VIEW'],
  ['Vendor.CREATE', 'Vendor', 'CREATE'],
  ['FiscalPeriod.VIEW', 'FiscalPeriod', 'VIEW'],
  ['FiscalPeriod.CREATE', 'FiscalPeriod', 'CREATE'],
  ['FiscalPeriod.EDIT', 'FiscalPeriod', 'EDIT'],
  ['WorkPackage.VIEW', 'WorkPackage', 'VIEW'],
  ['WorkPackage.CREATE', 'WorkPackage', 'CREATE'],
  ['WorkPackage.EDIT', 'WorkPackage', 'EDIT'],
  ['DailyReport.VIEW', 'DailyReport', 'VIEW'],
  ['DailyReport.CREATE', 'DailyReport', 'CREATE'],
  ['DailyReport.EDIT', 'DailyReport', 'EDIT'],
  ['Commissioning.VIEW', 'Commissioning', 'VIEW'],
  ['Commissioning.CREATE', 'Commissioning', 'CREATE'],
  ['Commissioning.EDIT', 'Commissioning', 'EDIT'],
  ['Handover.VIEW', 'Handover', 'VIEW'],
  ['Handover.CREATE', 'Handover', 'CREATE'],
  ['Handover.APPROVE', 'Handover', 'APPROVE'],
  ['CostCode.VIEW', 'CostCode', 'VIEW'],
  ['CostCode.CREATE', 'CostCode', 'CREATE'],
  ['ControlAccount.VIEW', 'ControlAccount', 'VIEW'],
  ['ControlAccount.CREATE', 'ControlAccount', 'CREATE'],
  ['Forecast.VIEW', 'Forecast', 'VIEW'],
  ['Forecast.CREATE', 'Forecast', 'CREATE'],
  ['Treasury.VIEW', 'Treasury', 'VIEW'],
  ['Treasury.CREATE', 'Treasury', 'CREATE'],
  ['Treasury.APPROVE', 'Treasury', 'APPROVE'],
  ['Treasury.RELEASE', 'Treasury', 'RELEASE'],
] as const;

async function main() {
  const entity = await prisma.legalEntity.upsert({
    where: { code: 'AEC-CON' },
    update: {},
    create: {
      code: 'AEC-CON',
      legalName: 'PT AEC Construction',
      taxIdentifier: '00.000.000.0-000.000',
      country: 'ID',
    },
  });

  const role = await prisma.role.upsert({
    where: { code: 'SUPER_ADMIN' },
    update: {},
    create: { code: 'SUPER_ADMIN', name: 'Super Administrator' },
  });

  for (const [code, resource, action] of permissions) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, resource, action },
    });
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId_scopeType_scopeValue: {
          roleId: role.id,
          permissionId: permission.id,
          scopeType: 'GLOBAL',
          scopeValue: '',
        },
      },
      update: {},
      create: { roleId: role.id, permissionId: permission.id, scopeType: 'GLOBAL', scopeValue: '' },
    });
  }

  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@aec.local' },
    update: { passwordHash, legalEntityId: entity.id, status: 'ACTIVE' },
    create: {
      username: 'admin',
      email: 'admin@aec.local',
      displayName: 'AEC Administrator',
      passwordHash,
      legalEntityId: entity.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId_effectiveFrom: {
        userId: admin.id,
        roleId: role.id,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    },
    update: { effectiveTo: null },
    create: {
      userId: admin.id,
      roleId: role.id,
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    },
  });

  // Demo approval roles (FR-FND-007) — approver untuk PR/PO
  const buyerRole = await prisma.role.upsert({
    where: { code: 'BUYER' },
    update: {},
    create: { code: 'BUYER', name: 'Buyer', description: 'Membuat PR' },
  });
  const procManagerRole = await prisma.role.upsert({
    where: { code: 'PROCUREMENT_MANAGER' },
    update: {},
    create: { code: 'PROCUREMENT_MANAGER', name: 'Procurement Manager', description: 'Menyetujui PR/PO' },
  });

  const buyerPassword = await bcrypt.hash('Buyer123!', 12);
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@aec.local' },
    update: { passwordHash: buyerPassword, legalEntityId: entity.id, status: 'ACTIVE' },
    create: {
      username: 'buyer',
      email: 'buyer@aec.local',
      displayName: 'Buyer Demo',
      passwordHash: buyerPassword,
      legalEntityId: entity.id,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId_effectiveFrom: { userId: buyer.id, roleId: buyerRole.id, effectiveFrom: new Date('2026-01-01T00:00:00.000Z') } },
    update: { effectiveTo: null },
    create: { userId: buyer.id, roleId: buyerRole.id, effectiveFrom: new Date('2026-01-01T00:00:00.000Z') },
  });
  // Admin dapat bertindak sebagai PROCUREMENT_MANAGER (approver demo)
  await prisma.userRole.upsert({
    where: { userId_roleId_effectiveFrom: { userId: admin.id, roleId: procManagerRole.id, effectiveFrom: new Date('2026-01-01T00:00:00.000Z') } },
    update: { effectiveTo: null },
    create: { userId: admin.id, roleId: procManagerRole.id, effectiveFrom: new Date('2026-01-01T00:00:00.000Z') },
  });

  // Buyer: bisa lihat/lihat project + buat PR + submit approval
  const buyerPermissionCodes = [
    'Project.VIEW',
    'WBS.VIEW',
    'PurchaseRequisition.VIEW',
    'PurchaseRequisition.CREATE',
    'PurchaseOrder.VIEW',
    'PurchaseOrder.CREATE',
    'Approval.VIEW',
    'Approval.SUBMIT',
    'Approval.APPROVE',
  ];
  for (const code of buyerPermissionCodes) {
    const permission = await prisma.permission.findUnique({ where: { code } });
    if (!permission) continue;
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId_scopeType_scopeValue: {
          roleId: buyerRole.id,
          permissionId: permission.id,
          scopeType: 'GLOBAL',
          scopeValue: '',
        },
      },
      update: {},
      create: { roleId: buyerRole.id, permissionId: permission.id, scopeType: 'GLOBAL', scopeValue: '' },
    });
  }

  // Demo project + WBS (PRD §46.4)
  const demoProject = await prisma.project.upsert({
    where: { code: 'PRJ-EPC-2027-014' },
    update: {},
    create: {
      code: 'PRJ-EPC-2027-014',
      name: 'EPC Industrial Processing Facility',
      client: 'PT Klien Utama',
      legalEntityId: entity.id,
      location: 'Karawang',
      currency: 'IDR',
    },
  });

  const wbsLevels = [
    { code: '1', name: 'Engineering' },
    { code: '2', name: 'Procurement' },
    { code: '3', name: 'Construction' },
    { code: '4', name: 'Commissioning' },
  ];
  for (const w of wbsLevels) {
    await prisma.wbsItem.upsert({
      where: { projectId_code: { projectId: demoProject.id, code: w.code } },
      update: {},
      create: { projectId: demoProject.id, code: w.code, name: w.name, sortOrder: Number(w.code) },
    });
  }

  console.log(
    `Seeded ${entity.code}, ${role.code}, ${admin.email}, ${buyer.email}, ${demoProject.code} + ${wbsLevels.length} WBS`,
  );

  // Demo warehouse project (FR-INV-002) — untuk goods receipt demo
  const demoWarehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-PROJ-014' },
    update: {},
    create: {
      code: 'WH-PROJ-014',
      name: 'Warehouse Proyek 014',
      warehouseType: 'PROJECT',
      projectId: demoProject.id,
      location: 'Karawang',
    },
  });
  console.log(`Seeded warehouse ${demoWarehouse.code}`);

  // VendorInvoice permissions
  const invoicePermissions = [
    ['VendorInvoice.VIEW', 'VendorInvoice', 'VIEW'],
    ['VendorInvoice.CREATE', 'VendorInvoice', 'CREATE'],
    ['VendorInvoice.POST', 'VendorInvoice', 'POST'],
    ['Payment.VIEW', 'Payment', 'VIEW'],
    ['Payment.CREATE', 'Payment', 'CREATE'],
    ['Payment.APPROVE', 'Payment', 'APPROVE'],
    ['Payment.PAY', 'Payment', 'PAY'],
  ] as const;
  for (const [code, resource, action] of invoicePermissions) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, resource, action },
    });
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId_scopeType_scopeValue: {
          roleId: role.id,
          permissionId: permission.id,
          scopeType: 'GLOBAL',
          scopeValue: '',
        },
      },
      update: {},
      create: { roleId: role.id, permissionId: permission.id, scopeType: 'GLOBAL', scopeValue: '' },
    });
  }

  // COA baseline (FR-FIN-002) — PSAK sederhana
  const coaBaseline: Array<{ code: string; name: string; accountType: string; normalBalance: string }> = [
    { code: '1100', name: 'Kas dan Bank', accountType: 'ASSET', normalBalance: 'DEBIT' },
    { code: '1200', name: 'Piutang Usaha', accountType: 'ASSET', normalBalance: 'DEBIT' },
    { code: '1510', name: 'PPN Masukan', accountType: 'ASSET', normalBalance: 'DEBIT' },
    { code: '1600', name: 'Persediaan', accountType: 'ASSET', normalBalance: 'DEBIT' },
    { code: '2100', name: 'Utang Usaha', accountType: 'LIABILITY', normalBalance: 'CREDIT' },
    { code: '2200', name: 'Utang Pajak', accountType: 'LIABILITY', normalBalance: 'CREDIT' },
    { code: '3100', name: 'Modal', accountType: 'EQUITY', normalBalance: 'CREDIT' },
    { code: '4100', name: 'Pendapatan', accountType: 'REVENUE', normalBalance: 'CREDIT' },
    { code: '6100', name: 'Beban Material', accountType: 'EXPENSE', normalBalance: 'DEBIT' },
    { code: '6200', name: 'Beban Operasional', accountType: 'EXPENSE', normalBalance: 'DEBIT' },
  ];
  for (const acc of coaBaseline) {
    await prisma.chartOfAccount.upsert({
      where: { legalEntityId_code: { legalEntityId: entity.id, code: acc.code } },
      update: {},
      create: { legalEntityId: entity.id, code: acc.code, name: acc.name, accountType: acc.accountType, normalBalance: acc.normalBalance },
    });
  }
  console.log(`Seeded ${coaBaseline.length} COA baseline`);

  // Workflow definition demo (FR-FND-007 full) — PR & PO approval
  const workflowSeeds = [
    {
      code: 'PR_APPROVAL',
      transactionType: 'PurchaseRequisition',
      steps: [
        { stepOrder: 1, name: 'Approval Manager Pengadaan', approverRoleCode: 'PROCUREMENT_MANAGER' },
      ],
    },
    {
      code: 'PO_APPROVAL',
      transactionType: 'PurchaseOrder',
      steps: [
        { stepOrder: 1, name: 'Approval Manager Pengadaan', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: 'totalAmount', conditionOp: '<=', conditionValue: 5000000 },
        { stepOrder: 2, name: 'Approval Direksi', approverRoleCode: 'SUPER_ADMIN', conditionField: 'totalAmount', conditionOp: '>', conditionValue: 5000000 },
      ],
    },
  ];
  for (const wf of workflowSeeds) {
    const existing = await prisma.workflowDefinition.findFirst({ where: { code: wf.code } });
    if (!existing) {
      const def = await prisma.workflowDefinition.create({
        data: {
          code: wf.code,
          name: wf.code.replace('_', ' '),
          version: 1,
          status: 'ACTIVE',
          transactionType: wf.transactionType,
          createdBy: 'system',
          steps: { create: wf.steps.map((s) => ({ ...s, conditionValue: s.conditionValue ?? null })) },
        },
      });
      console.log(`Seeded workflow ${def.code} v${def.version}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

