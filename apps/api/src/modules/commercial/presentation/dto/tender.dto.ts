import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateBidDecisionDto {
  @IsEnum(['PENDING', 'BID', 'NO_BID'])
  decision!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rationale?: string;
}

export class CreateEstimateDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @Type(() => Number)
  @IsNumber()
  totalAmount!: number;
}

export class CreatePricingScenarioDto {
  @IsEnum(['BASE', 'AGGRESSIVE', 'TARGET', 'NEGOTIATION_FLOOR', 'BEST_CASE'])
  scenarioType!: string;

  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  marginPct?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CreateContractDeviationDto {
  @IsString()
  @MaxLength(200)
  clause!: string;

  @IsString()
  @MaxLength(1000)
  clientRequirement!: string;

  @IsString()
  @MaxLength(1000)
  aecPosition!: string;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  risk?: string;

  @IsString()
  @MaxLength(200)
  owner!: string;
}

export class CreateTenderSubmissionDto {
  @IsString()
  opportunityId!: string;

  @IsOptional()
  @IsString()
  estimateId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  channel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  packageVersion?: string;

  @IsOptional()
  @IsDateString()
  submittedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  acknowledgement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fileHash?: string;
}

export class CreateContractAmendmentDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Type(() => Number)
  @IsNumber()
  amountChange!: number;

  @IsOptional()
  @IsDateString()
  signedDate?: string;
}

export class ListTenderQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @IsOptional()
  @IsString()
  status?: string;
}
