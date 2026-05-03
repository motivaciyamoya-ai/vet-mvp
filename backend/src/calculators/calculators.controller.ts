import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CalculatorsService } from './calculators.service';
import { DoseByWeightDto } from './dto/dose-by-weight.dto';
import { InfusionRateDto } from './dto/infusion-rate.dto';

@ApiTags('calculators')
@Controller('calculators')
export class CalculatorsController {
  constructor(private readonly calc: CalculatorsService) {}

  @Post('dose-by-weight')
  doseByWeight(@Body() dto: DoseByWeightDto) {
    return this.calc.doseByWeight(dto);
  }

  @Post('infusion-rate')
  infusionRate(@Body() dto: InfusionRateDto) {
    return this.calc.infusionRate(dto);
  }
}
