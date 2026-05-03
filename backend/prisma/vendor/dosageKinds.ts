/** Общие константы дозирования калькулятора без тяжёлого статического справочника препаратов */

export type AnimalKey = "dog" | "cat" | "rabbit" | "bird" | "reptile" | "horse";

export const DOSAGE_ANIMAL_KEYS: AnimalKey[] = [
  "dog",
  "cat",
  "rabbit",
  "bird",
  "reptile",
  "horse",
];

/** Одна строка из публичного GET /api/dosage-drugs или админских эндпоинтов */
export type DosageDrugApiRow = {
  id: string;
  nameRu: string;
  category: string;
  summary: string;
  instruction: string;
  warnings?: string;
  dosing?: Record<string, unknown>;
};
