import { CalculatorsService } from './calculators.service';

describe('CalculatorsService', () => {
  const svc = new CalculatorsService();

  it('doseByWeight', () => {
    const r = svc.doseByWeight({
      mgPerKg: 10,
      weightKg: 25,
      concentrationMgPerMl: 50,
    });
    expect(r.totalMg).toBe(250);
    expect(r.volumeMl).toBe(5);
  });

  it('infusionRate', () => {
    const r = svc.infusionRate({ dropsPerMinute: 20, dropsPerMl: 20 });
    expect(r.mlPerHour).toBe(60);
  });
});
