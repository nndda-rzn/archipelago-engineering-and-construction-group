import { IsISO31661Alpha2, IsString, Length } from 'class-validator';

export class CreateLegalEntityDto {
  @IsString()
  @Length(2, 20)
  code!: string;

  @IsString()
  @Length(2, 200)
  legalName!: string;

  @IsString()
  @Length(2, 50)
  taxIdentifier!: string;

  @IsISO31661Alpha2()
  country!: string;

  @IsString()
  @Length(3, 3)
  functionalCurrency = 'IDR';

  @IsString()
  @Length(3, 3)
  reportingCurrency = 'IDR';
}
