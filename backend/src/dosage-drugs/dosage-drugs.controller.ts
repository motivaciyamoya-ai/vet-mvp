import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DosageDrugsService } from './dosage-drugs.service';

@ApiTags('dosage-drugs')
@Controller('dosage-drugs')
export class DosageDrugsController {
  constructor(private readonly dosageDrugs: DosageDrugsService) {}

  /** Публичный список активных препаратов для калькулятора дозировок */
  @Get()
  listPublic() {
    return this.dosageDrugs.listActivePublic();
  }
}
