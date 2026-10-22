import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class FreezeBaselineDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class OpenRevisionDto {
  /** Wajib: revisi tanpa alasan tidak dapat diaudit. */
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
