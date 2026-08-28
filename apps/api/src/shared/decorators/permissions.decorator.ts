import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '@/shared/permissions/permissions';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: PermissionCode[]) => SetMetadata(PERMISSIONS_KEY, permissions);
