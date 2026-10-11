import { IsArray, IsBoolean, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export const ROLE_CATEGORIES = ['SYSTEM', 'FUNCTIONAL', 'PROJECT', 'CUSTOM'] as const;
export const ROLE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export class CreateRoleDto {
  @IsString()
  @Length(2, 50)
  code!: string;

  @IsString()
  @Length(2, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(ROLE_CATEGORIES)
  category?: (typeof ROLE_CATEGORIES)[number];

  @IsOptional()
  @IsIn(ROLE_STATUSES)
  status?: (typeof ROLE_STATUSES)[number];

  @IsOptional()
  @IsBoolean()
  isAssignable?: boolean;
}

/** Update parsial — semua opsional. `code` tidak dapat diubah setelah dibuat. */
export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(ROLE_CATEGORIES)
  category?: (typeof ROLE_CATEGORIES)[number];

  @IsOptional()
  @IsIn(ROLE_STATUSES)
  status?: (typeof ROLE_STATUSES)[number];

  @IsOptional()
  @IsBoolean()
  isAssignable?: boolean;
}

export class SetRoleStatusDto {
  @IsIn(ROLE_STATUSES)
  status!: (typeof ROLE_STATUSES)[number];
}

export class AssignPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissionCodes!: string[];
}

export class AddRoleMemberDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @IsOptional()
  @IsString()
  effectiveFrom?: string;
}
