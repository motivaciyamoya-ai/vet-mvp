import { Injectable } from '@nestjs/common';
import { DoseByWeightDto } from './dto/dose-by-weight.dto';
import { InfusionRateDto } from './dto/infusion-rate.dto';

@Injectable()
export class CalculatorsService {
  doseByWeight(dto: DoseByWeightDto) {
    const totalMg = dto.mgPerKg * dto.weightKg;
    const volumeMl = totalMg / dto.concentrationMgPerMl;
    return {
      totalMg: Math.round(totalMg * 10000) / 10000,
      volumeMl: Math.round(volumeMl * 1000) / 1000,
      disclaimer:
        'Расчёт справочный. Учитывайте вид, возраст, состояние пациента и регистрацию препарата. Не заменяет назначение врача.',
    };
  }

  infusionRate(dto: InfusionRateDto) {
    const mlPerHour = (dto.dropsPerMinute * 60) / dto.dropsPerMl;
    return {
      mlPerHour: Math.round(mlPerHour * 1000) / 1000,
      disclaimer:
        'Проверьте калибровку капельницы и фактическую концентрацию раствора. Не заменяет клинический протокол.',
    };
  }
}
