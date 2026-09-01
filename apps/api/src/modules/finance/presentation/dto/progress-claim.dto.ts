import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateProgressClaimDto {
  @IsString() projectId!: string;
  @IsOptional() @IsString() claimDate?: string;
  @IsOptional() @IsString() @MaxLength(30) period?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsIn(['PROGRESS', 'COST', 'TIME', 'EOT', 'CONTRACTUAL']) claimType?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3650) requestedExtensionDays?: number;
  @IsOptional() @IsString() workPackageId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) physicalProgressAtClaim?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) billableProgress?: number;
}

export class CertifyClaimDto {
  @Type(() => Number) @IsNumber() @Min(0) certifiedAmount!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) retentionRate?: number;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
}

export class ListProgressClaimQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) pageSize?: number;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsIn(['PROGRESS', 'COST', 'TIME', 'EOT', 'CONTRACTUAL']) claimType?: string;
}
