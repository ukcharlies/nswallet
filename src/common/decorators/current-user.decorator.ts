import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../../generated/prisma';

/**
 * CurrentUser decorator - Extracts the authenticated user from the request
 * 
 * Usage:
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 * 
 * @Get('profile')
 * getEmail(@CurrentUser('email') email: string) {
 *   return email;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
