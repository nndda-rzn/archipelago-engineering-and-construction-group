import { templatesFor, WORKFLOW_TEMPLATES } from './workflow-templates';

describe('workflow templates', () => {
  it('offers at least one template per supported transaction type', () => {
    expect(templatesFor('PurchaseRequisition').length).toBeGreaterThan(0);
    expect(templatesFor('PurchaseOrder').length).toBeGreaterThan(0);
  });

  it('returns every template when no type is given', () => {
    expect(templatesFor()).toHaveLength(WORKFLOW_TEMPLATES.length);
  });

  it('returns nothing for an unknown transaction type', () => {
    expect(templatesFor('SomethingElse')).toEqual([]);
  });

  it('every template has a name, a description and at least one step', () => {
    for (const t of WORKFLOW_TEMPLATES) {
      expect(t.name.length).toBeGreaterThan(2);
      expect(t.description.length).toBeGreaterThan(10);
      expect(t.steps.length).toBeGreaterThan(0);
    }
  });

  it('uses condition fields that are valid for the template transaction type', () => {
    // Satu sumber kebenaran: field harus berasal dari CONDITION_FIELDS kontrak.
    const validFields: Record<string, string[]> = {
      PurchaseRequisition: ['estimatedTotal'],
      PurchaseOrder: ['totalAmount'],
    };
    for (const t of WORKFLOW_TEMPLATES) {
      for (const step of t.steps) {
        if (step.conditionField) {
          expect(validFields[t.transactionType]).toContain(step.conditionField);
        }
      }
    }
  });

  it('keeps ids unique', () => {
    const ids = WORKFLOW_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
