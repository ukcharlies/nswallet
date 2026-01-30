import { SetMetadata } from '@nestjs/common';
import { Role } from '../../../generated/prisma';

export const ROLES_KEY = 'roles';

/**
 * Roles decorator - Restricts access to users with specific roles
 *
 * Usage:
 * @Roles(Role.ADMIN)
 * @Get('admin/users')
 * getAllUsers() {
 *   return this.usersService.findAll();
 * }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
