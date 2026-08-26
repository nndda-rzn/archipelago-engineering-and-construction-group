import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  legalEntityId!: string;

  @IsString()
  @Length(1, 200)
  name!: string;

  @IsEnum(['GROUP', 'LEGAL_ENTITY', 'BUSINESS_UNIT', 'DIVISION', 'REGION', 'BRANCH', 'DEPARTMENT', 'SECTION'])
  orgType!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class CreateDoaRuleDto {
  @IsString()
  @Length(1, 100)
  transactionType!: string;

  @IsOptional()
  @IsString()
  legalEntityId?: string;

  @IsOptional()
  @IsString()
  businessUnit?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currencyCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountFrom?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountTo?: number;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  riskLevel?: string;

  @IsEnum(['L1', 'L2', 'L3', 'L4', 'L5', 'L6'])
  approverLevel!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  approverRoleCode?: string;

  @IsOptional()
  @IsEnum(['SEQUENTIAL', 'PARALLEL'])
  approvalMode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;
}

export class ResolveDoaDto {
  @IsString()
  transactionType!: string;

  @IsOptional()
  @IsString()
  legalEntityId?: string;

  @IsOptional()
  @IsString()
  businessUnit?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  riskLevel?: string;
}

export class CreateCurrencyDto {
  @IsString()
  @Length(3, 3)
  code!: string;

  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  symbol?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  decimals?: number;
}

export class CreateExchangeRateDto {
  @IsString()
  fromCurrencyId!: string;

  @IsString()
  toCurrencyId!: string;

  @IsEnum(['SPOT', 'MONTHLY', 'PERIOD_END'])
  rateType!: string;

  @Type(() => Number)
  @IsNumber()
  rate!: number;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}
