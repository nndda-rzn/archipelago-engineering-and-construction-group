import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { UserStatus } from '@prisma/client';

export const USER_STATUSES = ['INVITED', 'ACTIVE', 'INACTIVE', 'BLOCKED', 'SUSPENDED'] as const;

export class CreateUserDto {
  @IsString()
  @Length(3, 50)
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(2, 100)
  displayName!: string;

  @IsString()
  @Length(8, 100)
  password!: string;

  @IsOptional()
  @IsString()
  legalEntityId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  roleCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  managerId?: string;
}

/** Update identitas & penempatan — semua opsional (parsial). */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  displayName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  legalEntityId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  managerId?: string;
}

export class SetUserStatusDto {
  @IsIn(USER_STATUSES)
  status!: UserStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class AssignRoleDto {
  @IsString()
  roleCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class ResetPasswordDto {
  @IsOptional()
  @IsString()
  @Length(8, 100)
  password?: string;
}

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  theme?: string;

  @IsOptional()
  @IsIn(['compact', 'comfortable'])
  density?: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  inAppNotifications?: boolean;
}

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @Length(3, 50)
  username?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  displayName?: string;

  @IsOptional()
  @IsString()
  legalEntityId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleCodes?: string[];
}

export class AcceptInvitationDto {
  @IsString()
  token!: string;

  @IsString()
  @Length(3, 50)
  username!: string;

  @IsString()
  @Length(2, 100)
  displayName!: string;

  @IsString()
  @Length(8, 100)
  password!: string;
}

export class ListUserQueryDto {
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
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  roleCode?: string;

  /** Filter "tanpa role" — untuk menutup celah user yang belum diberi akses. */
  @IsOptional()
  @IsIn(['true', 'false'])
  noRole?: string;
}
