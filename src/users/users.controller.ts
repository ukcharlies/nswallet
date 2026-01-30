import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';

/**
 * UsersController - User profile and management endpoints
 */
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get current user's profile
   */
  @Get('me')
  async getProfile(@CurrentUser() user: User) {
    const fullUser = await this.usersService.findByIdOrFail(user.id);
    return this.usersService.sanitizeUser(fullUser);
  }

  /**
   * Update current user's profile
   */
  @Patch('me')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const updated = await this.usersService.update(user.id, updateUserDto);
    return this.usersService.sanitizeUser(updated);
  }

  /**
   * Get user by ID (Admin only)
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findByIdOrFail(id);
    return this.usersService.sanitizeUser(user);
  }

  /**
   * Delete user (Admin only) - Soft delete
   */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.delete(id);
  }
}
