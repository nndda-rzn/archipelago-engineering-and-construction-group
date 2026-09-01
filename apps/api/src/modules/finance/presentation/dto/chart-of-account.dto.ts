import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateChartOfAccountDto {
  @IsString() legalEntityId!: string;
  @IsString() @Length(1, 30) code!: string;
  @IsString() @Length(1, 200) name!: string;
  @IsOptional() @IsString() accountType?: string;
  @IsOptional() @IsString() normalBalance?: string;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
}

export class ListChartOfAccountQueryDto {
  @IsOptional() @IsString() legalEntityId?: string;
}

export class TrialBalanceQueryDto {
  @IsString() legalEntityId!: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}
