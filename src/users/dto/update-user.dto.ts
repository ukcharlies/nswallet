import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO for updating user profile
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
