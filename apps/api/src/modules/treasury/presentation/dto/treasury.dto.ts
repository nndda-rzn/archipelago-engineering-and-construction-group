import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  legalEntityId!: string;

  @IsString()
  @Length(1, 30)
  bankCode!: string;

  @IsString()
  @Length(1, 100)
  bankName!: string;

  @IsString()
  @Length(1, 50)
  accountNumber!: string;

  @IsString()
  @Length(1, 200)
  accountName!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  openingBalance?: number;
}

export class ListBankAccountQueryDto {
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

  @IsOptional()
  @IsString()
  currency?: string;
}

export class CreatePaymentProposalDto {
  @IsString()
  legalEntityId!: string;

  @IsString()
  vendor!: string;

  @Type(() => Number)
  @IsNumber()
  totalAmount!: number;

  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsString({ each: true })
  invoiceIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}

export class ListPaymentProposalQueryDto {
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

export class CreateBankGuaranteeDto {
  @IsString()
  legalEntityId!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsEnum(['BID', 'PERFORMANCE', 'ADVANCE', 'RETENTION', 'MAINTENANCE'])
  guaranteeType?: string;

  @IsString()
  @MaxLength(200)
  beneficiary!: string;

  @IsString()
  @MaxLength(100)
  bankName!: string;

  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class ListBankGuaranteeQueryDto {
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

  @IsOptional()
  @IsString()
  guaranteeType?: string;
}

export class CreateCashForecastDto {
  @IsString()
  legalEntityId!: string;

  @IsString()
  period!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  expectedReceipt?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  expectedAp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  expectedPayroll?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  expectedLoan?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  expectedTax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  projectCashFlow?: number;
}

export class CreateFxExposureDto {
  @IsString()
  legalEntityId!: string;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @Type(() => Number)
  @IsNumber()
  exposureAmount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rate?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  baseCurrency?: string;
}
