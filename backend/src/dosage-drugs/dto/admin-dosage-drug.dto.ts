import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

export class AdminCreateDosageDrugDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'id: латиница, начинается с буквы, только a-z, цифры и подчёркивание',
  })
  id!: string;

  @IsString()
  @IsNotEmpty()
  nameRu!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsNotEmpty()
  summary!: string;

  @IsString()
  @IsNotEmpty()
  instruction!: string;

  @IsOptional()
  @ValidateIf((_, v: unknown) => v !== undefined && v !== null)
  @IsString()
  warnings?: string | null;

  /** Ключи: dog, cat, rabbit, bird, reptile, horse; значения — { mgPerKg, freq, duration, note? } */
  @IsObject()
  dosing!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class AdminPatchDosageDrugDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nameRu?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  category?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  summary?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  instruction?: string;

  @IsOptional()
  @ValidateIf((_, v: unknown) => v !== undefined && v !== null)
  @IsString()
  warnings?: string | null;

  @IsOptional()
  @IsObject()
  dosing?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
