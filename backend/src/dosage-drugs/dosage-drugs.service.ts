import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DosageDrug, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminCreateDosageDrugDto, AdminPatchDosageDrugDto } from './dto/admin-dosage-drug.dto';
import { seedDosageDrugsFromBuiltinCatalog, type DosageBuiltinCatalog } from './dosage-drugs-builtin.seed';

const ALLOWED_ANIMALS = new Set(['dog', 'cat', 'rabbit', 'bird', 'reptile', 'horse']);

export type DosageDrugPublic = {
  id: string;
  nameRu: string;
  category: string;
  summary: string;
  instruction: string;
  warnings?: string;
  dosing: Record<string, unknown>;
};

export type DosageDrugAdmin = DosageDrugPublic & {
  active: boolean;
  sortOrder: number;
};

@Injectable()
export class DosageDrugsService {
  constructor(private readonly prisma: PrismaService) {}

  private toPublic(row: DosageDrug): DosageDrugPublic {
    return {
      id: row.id,
      nameRu: row.nameRu,
      category: row.category,
      summary: row.summary,
      instruction: row.instruction,
      warnings: row.warnings ?? undefined,
      dosing: (row.dosing as Record<string, unknown>) ?? {},
    };
  }

  private toAdmin(row: DosageDrug): DosageDrugAdmin {
    return { ...this.toPublic(row), active: row.active, sortOrder: row.sortOrder };
  }

  sanitizeDosing(input: unknown): Prisma.InputJsonValue {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('Поле dosing должно быть объектом с ключами видов животных.');
    }
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      if (!ALLOWED_ANIMALS.has(key)) continue;
      if (!val || typeof val !== 'object' || Array.isArray(val)) continue;
      const v = val as Record<string, unknown>;
      const mg = Number(v.mgPerKg);
      if (!Number.isFinite(mg)) continue;
      const line: Record<string, unknown> = {
        mgPerKg: mg,
        freq: String(v.freq ?? ''),
        duration: String(v.duration ?? ''),
      };
      if (v.note != null && String(v.note).trim() !== '') {
        line.note = String(v.note);
      }
      out[key] = line;
    }
    return out as Prisma.InputJsonValue;
  }

  async listActivePublic(): Promise<DosageDrugPublic[]> {
    const rows = await this.prisma.dosageDrug.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }],
    });
    return rows.map((r) => this.toPublic(r));
  }

  async listAllForAdmin(): Promise<DosageDrugAdmin[]> {
    const rows = await this.prisma.dosageDrug.findMany({
      orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }],
    });
    return rows.map((r) => this.toAdmin(r));
  }

  async findByIdOrThrow(id: string): Promise<DosageDrugPublic> {
    const row = await this.prisma.dosageDrug.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Препарат не найден');
    return this.toPublic(row);
  }

  async findByIdOrThrowAdmin(id: string): Promise<DosageDrugAdmin> {
    const row = await this.prisma.dosageDrug.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Препарат не найден');
    return this.toAdmin(row);
  }

  async create(dto: AdminCreateDosageDrugDto): Promise<DosageDrugAdmin> {
    const exists = await this.prisma.dosageDrug.findUnique({ where: { id: dto.id } });
    if (exists) throw new ConflictException('Препарат с таким id уже есть');
    const dosing = this.sanitizeDosing(dto.dosing);
    const row = await this.prisma.dosageDrug.create({
      data: {
        id: dto.id,
        nameRu: dto.nameRu,
        category: dto.category,
        summary: dto.summary,
        instruction: dto.instruction,
        warnings: dto.warnings ?? null,
        dosing,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return this.toAdmin(row);
  }

  async patch(id: string, dto: AdminPatchDosageDrugDto): Promise<DosageDrugAdmin> {
    await this.findByIdOrThrowAdmin(id);
    const data: Prisma.DosageDrugUpdateInput = {};
    if (dto.nameRu !== undefined) data.nameRu = dto.nameRu;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.summary !== undefined) data.summary = dto.summary;
    if (dto.instruction !== undefined) data.instruction = dto.instruction;
    if (dto.warnings !== undefined) data.warnings = dto.warnings;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.dosing !== undefined) data.dosing = this.sanitizeDosing(dto.dosing);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Нет полей для обновления');
    }
    const row = await this.prisma.dosageDrug.update({
      where: { id },
      data,
    });
    return this.toAdmin(row);
  }

  async remove(id: string): Promise<void> {
    await this.findByIdOrThrow(id);
    await this.prisma.dosageDrug.delete({ where: { id } });
  }

  /**
   * Вставляет в БД отсутствующие позиции из bundled prisma/vendor/vetDosageReference.cjs
   * (собирается npm run sync-dosage-vendor). Существующие id не перезаписываются.
   */
  async importBuiltinMissing(): Promise<{ created: number; catalogSize: number }> {
    const cjsPath = path.join(process.cwd(), 'prisma', 'vendor', 'vetDosageReference.cjs');
    if (!fs.existsSync(cjsPath)) {
      throw new BadRequestException(
        'Не найден prisma/vendor/vetDosageReference.cjs. В каталоге backend выполните npm run sync-dosage-vendor и перезапустите API.',
      );
    }
    const requireFn = createRequire(path.join(process.cwd(), 'package.json'));
    let catalog: DosageBuiltinCatalog;
    try {
      catalog = requireFn(cjsPath) as DosageBuiltinCatalog;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new BadRequestException(`Не удалось загрузить встроенный каталог: ${msg}`);
    }
    if (!catalog?.DRUG_REFERENCE || !catalog?.DOSAGE_ANIMAL_KEYS) {
      throw new BadRequestException('Файл vetDosageReference.cjs не экспортирует DRUG_REFERENCE / DOSAGE_ANIMAL_KEYS.');
    }
    return seedDosageDrugsFromBuiltinCatalog(this.prisma, catalog, { log: false });
  }
}
