/**
 * Satu sumber label untuk menerjemahkan kode mesin menjadi teks yang bisa dibaca manusia.
 *
 * Masalah yang diselesaikan: kode seperti `AUTH.LOGIN_SUCCESS`, `LegalEntity.VIEW`, atau
 * `SUPER_ADMIN` bocor apa adanya ke UI. Semua kode berpola `Resource.ACTION`, jadi satu
 * humanizer menurunkan sebagian besar kasus dari dua tabel + fallback aman.
 *
 * Prinsip: SELALU ada yang tampil. Kode yang tidak dikenal diturunkan (bukan dikosongkan),
 * dan bila tetap gagal, kode aslinya dikembalikan apa adanya.
 */

/** Label Inggris untuk nama resource (bagian sebelum titik pada kode). */
export const RESOURCE_LABELS: Record<string, string> = {
  AccessReview: 'Access Review',
  APPROVAL: 'Approval',
  AuditEngagement: 'Audit Engagement',
  AuditFinding: 'Audit Finding',
  AUTH: 'Authentication',
  BankAccount: 'Bank Account',
  BankGuarantee: 'Bank Guarantee',
  BidDecision: 'Bid Decision',
  BUDGET: 'Budget',
  CashForecast: 'Cash Forecast',
  ChartOfAccount: 'Chart of Account',
  Client: 'Client',
  ClientInvoice: 'Client Invoice',
  Collection: 'Collection',
  Commissioning: 'Commissioning',
  Contract: 'Contract',
  ContractAmendment: 'Contract Amendment',
  ContractDeviation: 'Contract Deviation',
  ControlAccount: 'Control Account',
  CorrectiveAction: 'Corrective Action',
  CostCode: 'Cost Code',
  Currency: 'Currency',
  DailyReport: 'Daily Report',
  Deliverable: 'Deliverable',
  DoaRule: 'DOA Rule',
  Drawing: 'Drawing',
  Employee: 'Employee',
  Equipment: 'Equipment',
  EquipmentAssignment: 'Equipment Assignment',
  EquipmentBreakdown: 'Equipment Breakdown',
  EquipmentPm: 'Equipment PM',
  EquipmentUsage: 'Equipment Usage',
  EquipmentUtilization: 'Equipment Utilization',
  Estimate: 'Estimate',
  ExchangeRate: 'Exchange Rate',
  FiscalPeriod: 'Fiscal Period',
  Forecast: 'Forecast',
  FxExposure: 'FX Exposure',
  GR: 'Goods Receipt',
  Handover: 'Handover',
  HseIncident: 'HSE Incident',
  InspectionRequest: 'Inspection Request',
  Intercompany: 'Intercompany',
  Itp: 'ITP',
  Journal: 'Journal',
  LegalCase: 'Legal Case',
  MaterialIssue: 'Material Issue',
  Ncr: 'NCR',
  Opportunity: 'Opportunity',
  Organization: 'Organization',
  Payment: 'Payment',
  PaymentProposal: 'Payment Proposal',
  PayrollAllocation: 'Payroll Allocation',
  PeriodClose: 'Period Close',
  PermitToWork: 'Permit to Work',
  PO: 'Purchase Order',
  PoChange: 'PO Change',
  PR: 'Purchase Requisition',
  PricingScenario: 'Pricing Scenario',
  ProgressClaim: 'Progress Claim',
  PROJECT: 'Project',
  ProjectAssignment: 'Project Assignment',
  PunchListItem: 'Punch List Item',
  Rfi: 'RFI',
  Rfq: 'RFQ',
  Risk: 'Risk',
  SafetyObservation: 'Safety Observation',
  StockAdjustment: 'Stock Adjustment',
  StockOpname: 'Stock Opname',
  StockTransfer: 'Stock Transfer',
  Subcontract: 'Subcontract',
  SubcontractProgress: 'Subcontract Progress',
  Submittal: 'Submittal',
  TenderSubmission: 'Tender Submission',
  Timesheet: 'Timesheet',
  Transmittal: 'Transmittal',
  USER: 'User',
  Variation: 'Variation',
  Vendor: 'Vendor',
  VendorInvoice: 'Vendor Invoice',
  VendorPerformance: 'Vendor Performance',
  Warehouse: 'Warehouse',
  WBS: 'WBS',
  Workflow: 'Workflow',
  WorkPackage: 'Work Package',
  // Resource khusus audit log (kapitalisasi kalimat)
  Auth: 'Authentication',
  // Resource khusus permission (bukan action audit)
  LegalEntity: 'Legal Entity',
  Role: 'Role',
  Audit: 'Audit',
  PurchaseRequisition: 'Purchase Requisition',
  PurchaseOrder: 'Purchase Order',
  Permission: 'Permission',
  OrganizationUnit: 'Organization Unit',
  VendorMaster: 'Vendor',
  EmployeeMaster: 'Employee',
};

/** Label Inggris untuk verb (bagian setelah titik pada kode). */
export const ACTION_LABELS: Record<string, string> = {
  ADD_STEP: 'Add Step',
  ANSWER: 'Answer',
  APPROVE: 'Approve',
  AUTO_POST: 'Auto-Post',
  BLOCK: 'Block',
  CERTIFY: 'Certify',
  CHANGE_STATUS: 'Change Status',
  CLOSE: 'Close',
  COMPLETE: 'Complete',
  CREATE: 'Create',
  DISPOSE: 'Dispose',
  END: 'End',
  EVALUATE: 'Evaluate',
  EXECUTE: 'Execute',
  INSPECT: 'Inspect',
  INVESTIGATE: 'Investigate',
  LOCK: 'Lock',
  LOGIN_FAILED: 'Login Failed',
  LOGIN_SUCCESS: 'Login Successful',
  MITIGATE: 'Mitigate',
  NEW_VERSION: 'New Version',
  PAY: 'Pay',
  POST: 'Post',
  PROGRESS: 'Progress',
  PUBLISH: 'Publish',
  QUOTE: 'Quote',
  REINSPECT: 'Re-inspect',
  REJECT: 'Reject',
  RELEASE: 'Release',
  RESOLVE: 'Resolve',
  RESPOND: 'Respond',
  REVIEW: 'Review',
  REVOKE: 'Revoke',
  SEND: 'Send',
  STAGE: 'Stage',
  START: 'Start',
  STATUS: 'Status',
  STEP: 'Step',
  SUBMIT: 'Submit',
  TECHNICAL_REVIEW: 'Technical Review',
  TRANSITION: 'Transition',
  UPSERT: 'Save',
  VERIFY: 'Verify',
  // Verb khusus permission
  VIEW: 'View',
  EDIT: 'Edit',
  DELETE: 'Delete',
  EXPORT: 'Export',
  IMPORT: 'Import',
};

/** Override untuk kode yang tidak pas bila dirangkai kata-per-kata. */
const ACTION_OVERRIDES: Record<string, string> = {
  'AUTH.LOGIN_SUCCESS': 'Login Successful',
  'AUTH.LOGIN_FAILED': 'Login Failed',
  'Workflow.ADD_STEP': 'Add Workflow Step',
  'Workflow.NEW_VERSION': 'New Workflow Version',
  'BUDGET.UPSERT': 'Save Budget',
  'Journal.AUTO_POST': 'Auto-Post Journal',
};

/** Kode role umum → label Inggris. Kode di luar daftar ini diturunkan via humanizeCode. */
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrator',
  PROCUREMENT_MANAGER: 'Procurement Manager',
  BUYER: 'Buyer',
  MAKER: 'Maker',
  CHECKER: 'Checker',
  DIRECTOR: 'Director',
  MANAGER: 'Manager',
  VIEWER: 'Viewer',
};

/** Kode error API yang perlu pesan user-facing → label Inggris. */
export const ERROR_LABELS: Record<string, string> = {
  INVALID_CREDENTIALS: 'Incorrect email or password',
  USER_INACTIVE: 'Your account is not active',
  AUTH_REQUIRED: 'Please sign in to continue',
  PERMISSION_DENIED: 'You do not have permission for this action',
  NOT_FOUND: 'The requested data was not found',
  INTERNAL_ERROR: 'An unexpected error occurred',
};

/**
 * Akronim domain yang harus dipertahankan apa adanya. Di luar daftar ini, setiap kata
 * di-title-case, sehingga `NEW_THING` → `"New Thing"` dan bukan `"NEW THING"`.
 */
const KNOWN_ACRONYMS = new Set([
  'RFI', 'RFQ', 'PO', 'PR', 'GR', 'WBS', 'GL', 'HSE', 'ITP', 'NCR', 'DOA', 'EPC',
  'FX', 'EVM', 'KPI', 'COA', 'ID', 'IDR', 'CSV', 'API', 'AR', 'AP', 'PM', 'WP',
  'AC', 'EM', 'HR', 'QHSE', 'SOP', 'AD', 'BC', 'OA',
]);

/**
 * Pecah camelCase / PascalCase / SNAKE_CASE menjadi kata-kata.
 * `SomeThing.NEW_THING` → `"Some Thing · New Thing"`.
 * Dipakai sebagai fallback terakhir, bukan pengganti tabel.
 */
export function humanizeCode(code: string): string {
  return code
    .split('.')
    .map((segment) =>
      segment
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => {
          const upper = word.toUpperCase();
          if (KNOWN_ACRONYMS.has(upper)) return upper;
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' '),
    )
    .join(' · ');
}

/** `Journal` → `"Journal"`; `SomeThing` → `"Some Thing"`. */
export function labelResource(resource: string): string {
  return RESOURCE_LABELS[resource] ?? humanizeCode(resource);
}

/** `CREATE` → `"Create"`; `NEW_THING` → `"New Thing"`. */
export function labelActionVerb(verb: string): string {
  return ACTION_LABELS[verb] ?? humanizeCode(verb);
}

/**
 * `AUTH.LOGIN_SUCCESS` → `"Login Successful"` · `Journal.POST` → `"Post Journal"` ·
 * `LegalEntity.VIEW` → `"View Legal Entity"`.
 *
 * Kode tanpa titik dikembalikan setelah diturunkan. Kode yang tak dikenal tetap
 * menghasilkan teks (bukan string kosong) berkat humanizeCode.
 */
export function labelAction(code: string): string {
  if (ACTION_OVERRIDES[code]) return ACTION_OVERRIDES[code];

  const dotIndex = code.indexOf('.');
  if (dotIndex === -1) return humanizeCode(code);

  const resourceRaw = code.slice(0, dotIndex);
  const verbRaw = code.slice(dotIndex + 1);
  const resource = labelResource(resourceRaw);
  const verb = labelActionVerb(verbRaw);

  // Rangkaian yang lebih terbaca untuk verb tertentu.
  switch (verbRaw) {
    case 'CREATE':
      return `Create ${resource}`;
    case 'STATUS':
      return `Update ${resource} Status`;
    case 'CHANGE_STATUS':
      return `Change ${resource} Status`;
    case 'STAGE':
      return `Update ${resource} Stage`;
    default:
      return `${verb} ${resource}`;
  }
}

/** `LegalEntity.VIEW` → `"View Legal Entity"`. Permission memakai pola yang sama dengan action. */
export function labelPermission(code: string): string {
  return labelAction(code);
}

/** `SUPER_ADMIN` → `"Super Administrator"`; kode tak dikenal tetap diturunkan. */
export function labelRole(code: string): string {
  return ROLE_LABELS[code] ?? humanizeCode(code);
}

/** `AUTH_REQUIRED` → `"Please sign in to continue"`; kode tak dikenal tetap diturunkan. */
export function labelErrorCode(code: string): string {
  return ERROR_LABELS[code] ?? humanizeCode(code);
}
