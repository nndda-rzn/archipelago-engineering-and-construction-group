/**
 * Kode permission AEC ERP - SATU sumber kebenaran untuk backend & frontend.
 *
 * Ini gabungan dari tiga daftar yang sebelumnya terpisah dan sempat berbeda:
 * controller backend (`@Permissions`), matrix seed (yang masuk DB), dan
 * kebutuhan UI. Menyatukannya di sini menghapus drift - dulu `Handover.EDIT`
 * dipakai controller tapi tak pernah di-seed, sehingga endpoint handover
 * approve/verify tidak bisa diakses siapa pun.
 *
 * Format kode: `Resource.ACTION` (mis. `Analytics.VIEW`).
 */
export const Permission = {
  AccessReviewCreate: 'AccessReview.CREATE',
  AccessReviewEdit: 'AccessReview.EDIT',
  AccessReviewView: 'AccessReview.VIEW',
  AnalyticsView: 'Analytics.VIEW',
  ApprovalApprove: 'Approval.APPROVE',
  ApprovalSubmit: 'Approval.SUBMIT',
  ApprovalView: 'Approval.VIEW',
  AuditCreate: 'Audit.CREATE',
  AuditEdit: 'Audit.EDIT',
  AuditView: 'Audit.VIEW',
  BudgetApprove: 'Budget.APPROVE',
  BudgetCreate: 'Budget.CREATE',
  BudgetView: 'Budget.VIEW',
  ChartOfAccountCreate: 'ChartOfAccount.CREATE',
  ChartOfAccountView: 'ChartOfAccount.VIEW',
  ClientCreate: 'Client.CREATE',
  ClientView: 'Client.VIEW',
  ClientInvoiceCreate: 'ClientInvoice.CREATE',
  ClientInvoicePost: 'ClientInvoice.POST',
  ClientInvoiceView: 'ClientInvoice.VIEW',
  CollectionCreate: 'Collection.CREATE',
  CollectionPost: 'Collection.POST',
  CollectionView: 'Collection.VIEW',
  CommissioningCreate: 'Commissioning.CREATE',
  CommissioningEdit: 'Commissioning.EDIT',
  CommissioningView: 'Commissioning.VIEW',
  ContractCreate: 'Contract.CREATE',
  ContractEdit: 'Contract.EDIT',
  ContractExecute: 'Contract.EXECUTE',
  ContractView: 'Contract.VIEW',
  ControlAccountCreate: 'ControlAccount.CREATE',
  ControlAccountView: 'ControlAccount.VIEW',
  CorrectiveActionCreate: 'CorrectiveAction.CREATE',
  CorrectiveActionVerify: 'CorrectiveAction.VERIFY',
  CostCodeCreate: 'CostCode.CREATE',
  CostCodeView: 'CostCode.VIEW',
  DailyReportCreate: 'DailyReport.CREATE',
  DailyReportEdit: 'DailyReport.EDIT',
  DailyReportView: 'DailyReport.VIEW',
  EmployeeCreate: 'Employee.CREATE',
  EmployeeView: 'Employee.VIEW',
  EmployeeAssignmentCreate: 'EmployeeAssignment.CREATE',
  EngineeringCreate: 'Engineering.CREATE',
  EngineeringEdit: 'Engineering.EDIT',
  EngineeringView: 'Engineering.VIEW',
  EquipmentCreate: 'Equipment.CREATE',
  EquipmentOperate: 'Equipment.OPERATE',
  EquipmentPm: 'Equipment.PM',
  EquipmentView: 'Equipment.VIEW',
  EquipmentAssignmentCreate: 'EquipmentAssignment.CREATE',
  FiscalPeriodCreate: 'FiscalPeriod.CREATE',
  FiscalPeriodEdit: 'FiscalPeriod.EDIT',
  FiscalPeriodView: 'FiscalPeriod.VIEW',
  ForecastCreate: 'Forecast.CREATE',
  ForecastView: 'Forecast.VIEW',
  FoundationHardeningView: 'FoundationHardening.VIEW',
  GoodsReceiptCreate: 'GoodsReceipt.CREATE',
  GoodsReceiptView: 'GoodsReceipt.VIEW',
  HandoverApprove: 'Handover.APPROVE',
  HandoverCreate: 'Handover.CREATE',
  HandoverEdit: 'Handover.EDIT',
  HandoverView: 'Handover.VIEW',
  HseIncidentCreate: 'HseIncident.CREATE',
  HseIncidentInvestigate: 'HseIncident.INVESTIGATE',
  HseIncidentResolve: 'HseIncident.RESOLVE',
  HseIncidentView: 'HseIncident.VIEW',
  JournalCreate: 'Journal.CREATE',
  JournalPost: 'Journal.POST',
  JournalView: 'Journal.VIEW',
  LegalCaseCreate: 'LegalCase.CREATE',
  LegalCaseEdit: 'LegalCase.EDIT',
  LegalCaseView: 'LegalCase.VIEW',
  LegalEntityBlock: 'LegalEntity.BLOCK',
  LegalEntityCreate: 'LegalEntity.CREATE',
  LegalEntityEdit: 'LegalEntity.EDIT',
  LegalEntityView: 'LegalEntity.VIEW',
  MasterDataView: 'MasterData.VIEW',
  MaterialIssueCreate: 'MaterialIssue.CREATE',
  MaterialIssueView: 'MaterialIssue.VIEW',
  OpportunityCreate: 'Opportunity.CREATE',
  OpportunityEdit: 'Opportunity.EDIT',
  OpportunityView: 'Opportunity.VIEW',
  PaymentApprove: 'Payment.APPROVE',
  PaymentCreate: 'Payment.CREATE',
  PaymentPay: 'Payment.PAY',
  PaymentView: 'Payment.VIEW',
  PayrollCreate: 'Payroll.CREATE',
  PayrollView: 'Payroll.VIEW',
  PermitToWorkCreate: 'PermitToWork.CREATE',
  PermitToWorkRevoke: 'PermitToWork.REVOKE',
  PermitToWorkView: 'PermitToWork.VIEW',
  ProcurementHardeningView: 'ProcurementHardening.VIEW',
  ProgressClaimCertify: 'ProgressClaim.CERTIFY',
  ProgressClaimCreate: 'ProgressClaim.CREATE',
  ProgressClaimView: 'ProgressClaim.VIEW',
  ProjectCreate: 'Project.CREATE',
  ProjectEdit: 'Project.EDIT',
  ProjectManageTeam: 'Project.MANAGE_TEAM',
  ProjectView: 'Project.VIEW',
  PurchaseOrderApprove: 'PurchaseOrder.APPROVE',
  PurchaseOrderCreate: 'PurchaseOrder.CREATE',
  PurchaseOrderRelease: 'PurchaseOrder.RELEASE',
  PurchaseOrderView: 'PurchaseOrder.VIEW',
  PurchaseRequisitionApprove: 'PurchaseRequisition.APPROVE',
  PurchaseRequisitionCreate: 'PurchaseRequisition.CREATE',
  PurchaseRequisitionView: 'PurchaseRequisition.VIEW',
  QualityClose: 'Quality.CLOSE',
  QualityCreate: 'Quality.CREATE',
  QualityInspect: 'Quality.INSPECT',
  QualityView: 'Quality.VIEW',
  RfqCreate: 'Rfq.CREATE',
  RfqEvaluate: 'Rfq.EVALUATE',
  RfqQuote: 'Rfq.QUOTE',
  RfqSend: 'Rfq.SEND',
  RfqView: 'Rfq.VIEW',
  RiskCreate: 'Risk.CREATE',
  RiskEdit: 'Risk.EDIT',
  RiskView: 'Risk.VIEW',
  RoleCreate: 'Role.CREATE',
  RoleDelete: 'Role.DELETE',
  RoleEdit: 'Role.EDIT',
  RoleView: 'Role.VIEW',
  SafetyObservationCreate: 'SafetyObservation.CREATE',
  SafetyObservationResolve: 'SafetyObservation.RESOLVE',
  SafetyObservationView: 'SafetyObservation.VIEW',
  StockAdjustmentApprove: 'StockAdjustment.APPROVE',
  StockAdjustmentCreate: 'StockAdjustment.CREATE',
  StockAdjustmentView: 'StockAdjustment.VIEW',
  StockLedgerView: 'StockLedger.VIEW',
  StockOpnameCreate: 'StockOpname.CREATE',
  StockOpnameView: 'StockOpname.VIEW',
  StockTransferCreate: 'StockTransfer.CREATE',
  StockTransferView: 'StockTransfer.VIEW',
  SubcontractCreate: 'Subcontract.CREATE',
  SubcontractView: 'Subcontract.VIEW',
  SubcontractProgressCreate: 'SubcontractProgress.CREATE',
  SubcontractProgressReject: 'SubcontractProgress.REJECT',
  SubcontractProgressVerify: 'SubcontractProgress.VERIFY',
  TimesheetApprove: 'Timesheet.APPROVE',
  TimesheetCreate: 'Timesheet.CREATE',
  TimesheetView: 'Timesheet.VIEW',
  TreasuryApprove: 'Treasury.APPROVE',
  TreasuryCreate: 'Treasury.CREATE',
  TreasuryRelease: 'Treasury.RELEASE',
  TreasuryView: 'Treasury.VIEW',
  UserBlock: 'User.BLOCK',
  UserCreate: 'User.CREATE',
  UserEdit: 'User.EDIT',
  UserManageRole: 'User.MANAGE_ROLE',
  UserResetPassword: 'User.RESET_PASSWORD',
  UserView: 'User.VIEW',
  VariationApprove: 'Variation.APPROVE',
  VariationCreate: 'Variation.CREATE',
  VariationReject: 'Variation.REJECT',
  VariationView: 'Variation.VIEW',
  VendorCreate: 'Vendor.CREATE',
  VendorView: 'Vendor.VIEW',
  VendorInvoiceCreate: 'VendorInvoice.CREATE',
  VendorInvoicePost: 'VendorInvoice.POST',
  VendorInvoiceView: 'VendorInvoice.VIEW',
  WbsCreate: 'WBS.CREATE',
  WbsEdit: 'WBS.EDIT',
  WbsView: 'WBS.VIEW',
  WarehouseCreate: 'Warehouse.CREATE',
  WarehouseView: 'Warehouse.VIEW',
  WorkPackageCreate: 'WorkPackage.CREATE',
  WorkPackageEdit: 'WorkPackage.EDIT',
  WorkPackageView: 'WorkPackage.VIEW',
  WorkflowCreate: 'Workflow.CREATE',
  WorkflowDelete: 'Workflow.DELETE',
  WorkflowEdit: 'Workflow.EDIT',
  WorkflowView: 'Workflow.VIEW',
} as const;

export type PermissionCode = (typeof Permission)[keyof typeof Permission];

/**
 * Kelompok domain izin — SATU sumber untuk seed (kolom `Permission.group`) dan
 * UI (pengelompokan matriks izin). Kunci = `resource` (bagian sebelum titik pada
 * kode izin). Resource yang tidak terdaftar jatuh ke `MASTER_DATA`.
 */
export const PERMISSION_GROUPS = [
  'FOUNDATION', 'PROCUREMENT', 'FINANCE', 'TREASURY', 'PROJECT', 'CONSTRUCTION',
  'INVENTORY', 'HSE', 'QUALITY', 'COMMERCIAL', 'ANALYTICS', 'GOVERNANCE', 'HCM',
  'ENGINEERING', 'MASTER_DATA',
] as const;
export type PermissionGroup = (typeof PERMISSION_GROUPS)[number];

export const PERMISSION_GROUP_OF: Record<string, PermissionGroup> = {
  // Foundation
  AccessReview: 'FOUNDATION', Audit: 'FOUNDATION', FoundationHardening: 'FOUNDATION',
  LegalEntity: 'FOUNDATION', Role: 'FOUNDATION', User: 'FOUNDATION',
  // Procurement
  GoodsReceipt: 'PROCUREMENT', ProcurementHardening: 'PROCUREMENT',
  PurchaseOrder: 'PROCUREMENT', PurchaseRequisition: 'PROCUREMENT', Rfq: 'PROCUREMENT',
  Vendor: 'PROCUREMENT', VendorInvoice: 'PROCUREMENT',
  // Finance
  Budget: 'FINANCE', ChartOfAccount: 'FINANCE', Client: 'FINANCE', ClientInvoice: 'FINANCE',
  Collection: 'FINANCE', Commissioning: 'FINANCE', CostCode: 'FINANCE', Forecast: 'FINANCE',
  Journal: 'FINANCE', Payment: 'FINANCE', ProgressClaim: 'FINANCE',
  // Treasury
  Treasury: 'TREASURY',
  // Project
  Contract: 'PROJECT', ControlAccount: 'PROJECT', Project: 'PROJECT', Variation: 'PROJECT',
  WBS: 'PROJECT', WorkPackage: 'PROJECT',
  // Construction
  DailyReport: 'CONSTRUCTION', Equipment: 'CONSTRUCTION', EquipmentAssignment: 'CONSTRUCTION',
  Handover: 'CONSTRUCTION', PermitToWork: 'CONSTRUCTION', Subcontract: 'CONSTRUCTION',
  SubcontractProgress: 'CONSTRUCTION', Timesheet: 'CONSTRUCTION',
  // Inventory
  MaterialIssue: 'INVENTORY', StockAdjustment: 'INVENTORY', StockLedger: 'INVENTORY',
  StockOpname: 'INVENTORY', StockTransfer: 'INVENTORY', Warehouse: 'INVENTORY',
  // HSE
  CorrectiveAction: 'HSE', HseIncident: 'HSE', SafetyObservation: 'HSE',
  // Quality
  Quality: 'QUALITY',
  // Commercial
  Opportunity: 'COMMERCIAL',
  // Analytics
  Analytics: 'ANALYTICS',
  // Governance
  Approval: 'GOVERNANCE', LegalCase: 'GOVERNANCE', Risk: 'GOVERNANCE', Workflow: 'GOVERNANCE',
  // HCM
  Employee: 'HCM', EmployeeAssignment: 'HCM', Payroll: 'HCM',
  // Engineering
  Engineering: 'ENGINEERING',
  // Master data
  Currency: 'MASTER_DATA', FiscalPeriod: 'MASTER_DATA', MasterData: 'MASTER_DATA',
  NumberSequence: 'MASTER_DATA',
};

/** Izin berisiko tinggi — ditandai di UI dan diperlakukan lebih hati-hati. */
export const SENSITIVE_PERMISSIONS: readonly string[] = [
  'Role.DELETE', 'Role.EDIT', 'User.BLOCK', 'User.EDIT', 'User.MANAGE_ROLE',
  'User.RESET_PASSWORD', 'Treasury.RELEASE', 'Journal.AUTO_POST', 'Payment.APPROVE',
  'VendorInvoice.POST', 'LegalEntity.EDIT', 'Workflow.DELETE',
];

export function permissionGroupOf(resource: string): PermissionGroup {
  return PERMISSION_GROUP_OF[resource] ?? 'MASTER_DATA';
}

export function isSensitivePermission(code: string): boolean {
  return SENSITIVE_PERMISSIONS.includes(code);
}
