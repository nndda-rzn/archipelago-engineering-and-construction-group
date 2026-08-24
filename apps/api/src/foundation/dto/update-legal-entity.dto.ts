import { PartialType } from '@nestjs/mapped-types';
import { CreateLegalEntityDto } from './create-legal-entity.dto';

export class UpdateLegalEntityDto extends PartialType(CreateLegalEntityDto) {}
