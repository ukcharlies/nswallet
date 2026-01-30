import { IsString, IsOptional } from 'class-validator';

/**
 * DTO for refreshing tokens
 * Token can be sent in body or cookie (cookie is preferred)
 */
export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
