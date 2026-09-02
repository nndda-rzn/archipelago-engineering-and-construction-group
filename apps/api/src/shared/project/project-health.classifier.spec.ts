import { classifyHealth } from './project-health.classifier';

describe('classifyHealth', () => {
  it('returns NO_BUDGET jika totalBudget === 0', () => {
    const result = classifyHealth(0, 0);
    expect(result.health).toBe('NO_BUDGET');
    expect(result.utilization).toBeNull();
  });

  it('returns NO_BUDGET jika totalBudget === 0 meskipun ada actual', () => {
    const result = classifyHealth(0, 100);
    expect(result.health).toBe('NO_BUDGET');
    expect(result.utilization).toBeNull();
  });

  it('returns ON_TRACK jika utilization <= 70', () => {
    const result = classifyHealth(1_000_000, 700_000);
    expect(result.health).toBe('ON_TRACK');
    expect(result.utilization).toBe(70);
  });

  it('returns ON_TRACK jika utilization < 70', () => {
    const result = classifyHealth(1_000_000, 500_000);
    expect(result.health).toBe('ON_TRACK');
    expect(result.utilization).toBe(50);
  });

  it('boundary 70% tepat → ON_TRACK', () => {
    const result = classifyHealth(100, 70);
    expect(result.health).toBe('ON_TRACK');
  });

  it('returns AT_RISK jika utilization 70.1%', () => {
    const result = classifyHealth(1000, 701);
    expect(result.health).toBe('AT_RISK');
  });

  it('returns AT_RISK jika utilization <= 90', () => {
    const result = classifyHealth(1_000_000, 800_000);
    expect(result.health).toBe('AT_RISK');
    expect(result.utilization).toBe(80);
  });

  it('boundary 90% tepat → AT_RISK', () => {
    const result = classifyHealth(100, 90);
    expect(result.health).toBe('AT_RISK');
  });

  it('returns CRITICAL jika utilization > 90', () => {
    const result = classifyHealth(100, 91);
    expect(result.health).toBe('CRITICAL');
  });

  it('returns CRITICAL jika utilization 100%', () => {
    const result = classifyHealth(1_000_000, 1_000_000);
    expect(result.health).toBe('CRITICAL');
    expect(result.utilization).toBe(100);
  });

  it('returns CRITICAL jika over budget (>100%)', () => {
    const result = classifyHealth(1_000_000, 1_500_000);
    expect(result.health).toBe('CRITICAL');
    expect(result.utilization).toBe(150);
  });

  it('menghitung utilization dengan benar', () => {
    const result = classifyHealth(200, 50);
    expect(result.utilization).toBe(25);
  });
});
