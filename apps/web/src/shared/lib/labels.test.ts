import { describe, expect, it } from 'vitest';
import { humanizeCode, labelAction, labelErrorCode, labelPermission, labelResource, labelRole } from '@aec/ui';

describe('humanizeCode', () => {
  it('memecah camelCase', () => {
    expect(humanizeCode('LegalCase')).toBe('Legal Case');
  });

  it('memecah SNAKE_CASE', () => {
    expect(humanizeCode('NEW_THING')).toBe('New Thing');
  });

  it('menangani titik sebagai pemisah', () => {
    expect(humanizeCode('SomeThing.NEW_THING')).toBe('Some Thing · New Thing');
  });

  it('mempertahankan akronim pendek', () => {
    expect(humanizeCode('RFI')).toBe('RFI');
  });
});

describe('labelResource', () => {
  it('memakai tabel label', () => {
    expect(labelResource('Journal')).toBe('Journal');
    expect(labelResource('PO')).toBe('Purchase Order');
    expect(labelResource('Auth')).toBe('Authentication');
  });

  it('menurunkan resource tak dikenal', () => {
    expect(labelResource('SomeNewThing')).toBe('Some New Thing');
  });
});

describe('labelAction', () => {
  it('override kode auth', () => {
    expect(labelAction('AUTH.LOGIN_SUCCESS')).toBe('Login Successful');
    expect(labelAction('AUTH.LOGIN_FAILED')).toBe('Login Failed');
  });

  it('verb POST dengan resource', () => {
    expect(labelAction('Journal.POST')).toBe('Post Journal');
  });

  it('verb CREATE memakai pola "Create X"', () => {
    expect(labelAction('Project.CREATE')).toBe('Create Project');
    expect(labelAction('VendorInvoice.CREATE')).toBe('Create Vendor Invoice');
  });

  it('verb STATUS memakai pola "Update X Status"', () => {
    expect(labelAction('Deliverable.STATUS')).toBe('Update Deliverable Status');
    expect(labelAction('Employee.CHANGE_STATUS')).toBe('Change Employee Status');
  });

  it('kode tak dikenal tetap menghasilkan teks, bukan kosong', () => {
    const out = labelAction('MysteryThing.DO_SOMETHING');
    expect(out).toBeTruthy();
    expect(out).toContain('Mystery Thing');
  });
});

describe('labelPermission', () => {
  it('memakai pola action', () => {
    expect(labelPermission('LegalEntity.VIEW')).toBe('View Legal Entity');
    expect(labelPermission('PurchaseOrder.APPROVE')).toBe('Approve Purchase Order');
  });
});

describe('labelRole', () => {
  it('memakai tabel role', () => {
    expect(labelRole('SUPER_ADMIN')).toBe('Super Administrator');
    expect(labelRole('PROCUREMENT_MANAGER')).toBe('Procurement Manager');
  });

  it('menurunkan role tak dikenal', () => {
    expect(labelRole('SITE_ENGINEER')).toBe('Site Engineer');
  });
});

describe('labelErrorCode', () => {
  it('memetakan kode error umum', () => {
    expect(labelErrorCode('INVALID_CREDENTIALS')).toBe('Incorrect email or password');
    expect(labelErrorCode('AUTH_REQUIRED')).toBe('Please sign in to continue');
  });

  it('kode tak dikenal tetap diturunkan', () => {
    expect(labelErrorCode('SOME_NEW_ERROR')).toBe('Some New Error');
  });
});
