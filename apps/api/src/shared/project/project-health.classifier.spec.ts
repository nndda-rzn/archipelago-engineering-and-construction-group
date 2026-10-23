import { classifyHealth } from './project-health.classifier';

describe('classifyHealth — dinilai dari CPI x SPI', () => {
  it('ON_TRACK hanya bila CPI dan SPI sama-sama >= 1', () => {
    const r = classifyHealth(1.1, 1.03);
    expect(r.health).toBe('ON_TRACK');
    expect(r.partial).toBe(false);
  });

  it('CRITICAL bila CPI dan SPI sama-sama < 1', () => {
    // Kasus nyata: empat proyek di data dev (PRJ-021/023/025/028).
    const r = classifyHealth(0.85, 0.63);
    expect(r.health).toBe('CRITICAL');
  });

  it('AT_RISK bila hanya biaya yang meleset', () => {
    expect(classifyHealth(0.93, 1.02).health).toBe('AT_RISK');
  });

  it('AT_RISK bila hanya jadwal yang meleset', () => {
    expect(classifyHealth(1.05, 0.8).health).toBe('AT_RISK');
  });

  it('tidak lagi menyebut proyek boros-dan-terlambat sebagai ON_TRACK', () => {
    // Regresi aturan lama: utilization 44,7% -> ON_TRACK, meski CPI 0,85 dan SPI 0,63.
    const r = classifyHealth(0.85, 0.63, 44.7);
    expect(r.health).not.toBe('ON_TRACK');
    expect(r.utilization).toBe(44.7);
  });

  it('batas tepat 1,0 dianggap memenuhi', () => {
    expect(classifyHealth(1, 1).health).toBe('ON_TRACK');
  });

  it('CPI di bawah 1 saja sudah tidak ON_TRACK', () => {
    expect(classifyHealth(0.999, 1.5).health).toBe('AT_RISK');
  });

  it('NO_BUDGET bila CPI tidak tersedia', () => {
    const r = classifyHealth(null, null);
    expect(r.health).toBe('NO_BUDGET');
    expect(r.partial).toBe(false);
  });

  it('menilai dari CPI saja bila SPI tidak tersedia, dan menandainya parsial', () => {
    const r = classifyHealth(1.2, null);
    expect(r.health).toBe('ON_TRACK');
    expect(r.partial).toBe(true);
  });

  it('proyek tanpa SPI dengan CPI < 1 tetap AT_RISK, bukan ON_TRACK', () => {
    const r = classifyHealth(0.93, null);
    expect(r.health).toBe('AT_RISK');
    expect(r.partial).toBe(true);
  });

  it('meneruskan utilization apa adanya tanpa memakainya sebagai status', () => {
    const r = classifyHealth(1.1, 1.03, 56.4);
    expect(r.utilization).toBe(56.4);
    expect(r.health).toBe('ON_TRACK');
  });
});
