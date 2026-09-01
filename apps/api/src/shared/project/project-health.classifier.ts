/**
 * ProjectHealthClassifier — klasifikasi health project berdasarkan budget utilization.
 * Menggantikan duplikasi threshold 70%/90% di:
 *   - project-health.service.ts
 *   - project-controls.service.ts (earnedValue)
 *   - portfolio.service.ts
 *
 * Contoh pakai:
 *   const { utilization, health } = classifyHealth(totalBudget, totalActual);
 */
export type HealthStatus = 'NO_BUDGET' | 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';

export interface HealthResult {
  utilization: number | null;
  health: HealthStatus;
}

export function classifyHealth(totalBudget: number, totalActual: number): HealthResult {
  if (totalBudget === 0) {
    return { utilization: null, health: 'NO_BUDGET' };
  }
  const utilization = (totalActual / totalBudget) * 100;
  let health: HealthStatus;
  if (utilization <= 70) health = 'ON_TRACK';
  else if (utilization <= 90) health = 'AT_RISK';
  else health = 'CRITICAL';
  return { utilization, health };
}
