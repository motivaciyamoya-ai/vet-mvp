import type { Prisma, PrismaClient } from '@prisma/client';

type AnimalLineSeed = {
  mgPerKg: number;
  freq: string;
  duration: string;
  note?: string;
};

export type BuiltinDosageDrugRow = {
  id: string;
  nameRu: string;
  category: string;
  summary: string;
  instruction: string;
  warnings?: string;
  dosing: Partial<Record<string, AnimalLineSeed>>;
};

export type DosageBuiltinCatalog = {
  DRUG_REFERENCE: readonly BuiltinDosageDrugRow[];
  DOSAGE_ANIMAL_KEYS: readonly string[];
};

function dosingRecordForDb(
  drug: BuiltinDosageDrugRow,
  animalKeys: readonly string[],
): Prisma.InputJsonValue {
  const out: Record<string, unknown> = {};
  for (const key of animalKeys) {
    const line = drug.dosing[key];
    if (!line) continue;
    const entry: Record<string, unknown> = {
      mgPerKg: line.mgPerKg,
      freq: line.freq,
      duration: line.duration,
    };
    const note = line.note?.trim();
    if (note) entry.note = note;
    out[key] = entry;
  }
  return out as Prisma.InputJsonValue;
}

/**
 * Вставляет в DosageDrug отсутствующие id из встроенного каталога; существующие строки не трогаем.
 */
export async function seedDosageDrugsFromBuiltinCatalog(
  prisma: PrismaClient,
  catalog: DosageBuiltinCatalog,
  opts?: { log?: boolean },
): Promise<{ created: number; catalogSize: number }> {
  const log = opts?.log ?? true;
  const { DRUG_REFERENCE, DOSAGE_ANIMAL_KEYS } = catalog;
  const catalogSize = DRUG_REFERENCE.length;
  if (log) console.log(`Seed: встроенный справочник препаратов — ${catalogSize} позиций.`);
  if (catalogSize === 0) {
    console.error(
      'Seed: справочник пуст (DRUG_REFERENCE.length === 0). Выполните npm run sync-dosage-vendor или проверьте prisma/vendor.',
    );
    return { created: 0, catalogSize: 0 };
  }
  let order = 0;
  let created = 0;
  for (const d of DRUG_REFERENCE) {
    const exists = await prisma.dosageDrug.findUnique({ where: { id: d.id }, select: { id: true } });
    if (!exists) {
      await prisma.dosageDrug.create({
        data: {
          id: d.id,
          nameRu: d.nameRu,
          category: d.category,
          summary: d.summary,
          instruction: d.instruction,
          warnings: d.warnings ?? null,
          dosing: dosingRecordForDb(d, DOSAGE_ANIMAL_KEYS),
          active: true,
          sortOrder: order,
        },
      });
      created += 1;
    }
    order += 10;
  }
  if (created > 0 && log) {
    console.log(`Seed: DosageDrug добавлено ${created} строк встроенного справочника (остальные id уже были в БД).`);
  }
  if (created === 0 && log && catalogSize > 0) {
    const dbCount = await prisma.dosageDrug.count();
    if (dbCount === 0) {
      console.warn(
        'Seed: в DosageDrug по-прежнему 0 строк — перепроверьте подключение к БД, миграции и загрузку справочника.',
      );
    }
  }
  return { created, catalogSize };
}
